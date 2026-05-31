import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstablishmentMemberRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestUser } from '../../common/types/request-user.type';
import { calculateCompletionScore } from '../../common/utils/completion.util';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../documents/storage.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateEstablishmentPhotoUploadDto } from './dto/create-establishment-photo-upload.dto';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';

const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class EstablishmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async create(user: RequestUser, dto: CreateEstablishmentDto) {
    const establishment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.establishment.create({
        data: {
          name: dto.name,
          type: dto.type,
          address: dto.address,
          city: dto.city,
          country: dto.country || 'France',
          sector: dto.sector,
          patientType: dto.patientType,
          softwareUsed: dto.softwareUsed,
          hasSecretary: dto.hasSecretary,
          secretaryType: dto.secretaryType,
          averagePatientsPerDay: dto.averagePatientsPerDay,
          isMultidisciplinary: dto.isMultidisciplinary,
          equipmentAvailable: dto.equipmentAvailable || [],
          mobilityOptions: dto.mobilityOptions || [],
          acceptedMissionTypes: dto.acceptedMissionTypes || [],
          minimumCompensation: dto.minimumCompensation,
          preferredDurations: dto.preferredDurations || [],
          refusedSchedules: dto.refusedSchedules || [],
          acceptedPatientTypes: dto.acceptedPatientTypes || [],
          knownSoftware: dto.knownSoftware || [],
          phone: dto.phone,
          email: dto.email,
          website: dto.website,
          description: dto.description,
        },
      });

      await tx.establishmentMember.create({
        data: {
          establishmentId: created.id,
          userId: user.id,
          role: EstablishmentMemberRole.OWNER,
        },
      });

      return created;
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.created',
      entityType: 'establishment',
      entityId: establishment.id,
    });

    return this.withSignedPhotoUrls({ ...establishment, photos: [] });
  }

  async listMine(userId: string) {
    const establishments = await this.prisma.establishment.findMany({
      where: { members: { some: { userId } } },
      include: { members: true, photos: this.photoInclude },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(establishments.map((item) => this.withSignedPhotoUrls(item)));
  }

  async update(user: RequestUser, establishmentId: string, dto: Partial<CreateEstablishmentDto>) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
    ]);

    const updated = await this.prisma.establishment.update({
      where: { id: establishmentId },
      data: dto,
      include: { photos: this.photoInclude },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.updated',
      entityType: 'establishment',
      entityId: updated.id,
    });

    return this.withSignedPhotoUrls(updated);
  }

  async delete(user: RequestUser, establishmentId: string) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
    ]);

    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
    });

    if (!establishment) {
      throw new NotFoundException('Etablissement introuvable.');
    }

    await this.prisma.establishment.delete({
      where: { id: establishmentId },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.deleted',
      entityType: 'establishment',
      entityId: establishmentId,
      metadata: { name: establishment.name },
    });

    return { deleted: true };
  }

  async addMember(user: RequestUser, establishmentId: string, dto: AddMemberDto) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
    ]);

    if (dto.role === EstablishmentMemberRole.OWNER) {
      throw new ForbiddenException('Impossible d’ajouter un propriétaire via cette route.');
    }

    const memberUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!memberUser) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const member = await this.prisma.establishmentMember.upsert({
      where: {
        establishmentId_userId: {
          establishmentId,
          userId: memberUser.id,
        },
      },
      update: { role: dto.role },
      create: {
        establishmentId,
        userId: memberUser.id,
        role: dto.role,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.member_added',
      entityType: 'establishment',
      entityId: establishmentId,
      metadata: { memberUserId: memberUser.id, role: dto.role },
    });

    return member;
  }

  async listPhotos(user: RequestUser, establishmentId: string) {
    await this.ensureCanManagePhotos(user.id, establishmentId);
    const photos = await this.prisma.establishmentPhoto.findMany({
      where: { establishmentId, uploadedAt: { not: null } },
      orderBy: [{ isPrimary: 'desc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    return Promise.all(photos.map((photo) => this.withSignedPhotoUrl(photo)));
  }

  async createPhotoUploadUrl(
    user: RequestUser,
    establishmentId: string,
    dto: CreateEstablishmentPhotoUploadDto,
  ) {
    await this.ensureCanManagePhotos(user.id, establishmentId);
    this.validatePhoto(dto);

    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `establishments/${establishmentId}/${randomUUID()}-${safeFileName}`;

    const photo = await this.prisma.establishmentPhoto.create({
      data: {
        establishmentId,
        fileName: safeFileName,
        storageKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });

    const signed = await this.storage.createUploadUrl(storageKey, dto.mimeType, dto.sizeBytes);

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.photo_upload_url_created',
      entityType: 'establishment',
      entityId: establishmentId,
      metadata: { photoId: photo.id, mimeType: dto.mimeType },
    });

    return { photoId: photo.id, storageKey, ...signed };
  }

  async confirmPhotoUpload(user: RequestUser, establishmentId: string, photoId: string) {
    await this.ensureCanManagePhotos(user.id, establishmentId);
    const photo = await this.findPhoto(establishmentId, photoId);
    const existingUploaded = await this.prisma.establishmentPhoto.count({
      where: { establishmentId, uploadedAt: { not: null } },
    });

    const updated = await this.prisma.establishmentPhoto.update({
      where: { id: photo.id },
      data: {
        uploadedAt: new Date(),
        isPrimary: existingUploaded === 0 ? true : photo.isPrimary,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.photo_upload_confirmed',
      entityType: 'establishment',
      entityId: establishmentId,
      metadata: { photoId },
    });

    return this.withSignedPhotoUrl(updated);
  }

  async setPrimaryPhoto(user: RequestUser, establishmentId: string, photoId: string) {
    await this.ensureCanManagePhotos(user.id, establishmentId);
    await this.findPhoto(establishmentId, photoId);

    await this.prisma.$transaction([
      this.prisma.establishmentPhoto.updateMany({
        where: { establishmentId },
        data: { isPrimary: false },
      }),
      this.prisma.establishmentPhoto.update({
        where: { id: photoId },
        data: { isPrimary: true },
      }),
    ]);

    return this.listPhotos(user, establishmentId);
  }

  async deletePhoto(user: RequestUser, establishmentId: string, photoId: string) {
    await this.ensureCanManagePhotos(user.id, establishmentId);
    const photo = await this.findPhoto(establishmentId, photoId);

    await this.prisma.establishmentPhoto.delete({ where: { id: photo.id } });

    const firstPhoto = await this.prisma.establishmentPhoto.findFirst({
      where: { establishmentId, uploadedAt: { not: null } },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    if (photo.isPrimary && firstPhoto) {
      await this.prisma.establishmentPhoto.update({
        where: { id: firstPhoto.id },
        data: { isPrimary: true },
      });
    }

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.photo_deleted',
      entityType: 'establishment',
      entityId: establishmentId,
      metadata: { photoId },
    });

    return { deleted: true };
  }

  async withSignedPhotoUrls<T extends { photos?: any[] }>(establishment: T): Promise<T & { completionScore: number }> {
    const completionScore = this.computeCompletionScore(establishment);
    if (!establishment.photos?.length) return { ...establishment, completionScore };

    const photos = await Promise.all(
      establishment.photos.map((photo) => this.withSignedPhotoUrl(photo)),
    );

    return { ...establishment, photos, completionScore };
  }

  private async withSignedPhotoUrl<T extends { storageKey: string; fileName: string; mimeType: string }>(photo: T) {
    const signed = await this.storage.createDownloadUrl(photo.storageKey, photo.fileName, photo.mimeType);
    return { ...photo, url: signed.downloadUrl };
  }

  private get photoInclude() {
    return {
      where: { uploadedAt: { not: null } },
      orderBy: [{ isPrimary: 'desc' as const }, { orderIndex: 'asc' as const }, { createdAt: 'asc' as const }],
    };
  }

  private async ensureCanManagePhotos(userId: string, establishmentId: string) {
    return this.permissions.ensureEstablishmentMember(userId, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
      EstablishmentMemberRole.RECRUITER,
    ]);
  }

  private async findPhoto(establishmentId: string, photoId: string) {
    const photo = await this.prisma.establishmentPhoto.findFirst({
      where: { id: photoId, establishmentId },
    });

    if (!photo) {
      throw new NotFoundException('Photo introuvable.');
    }

    return photo;
  }

  private validatePhoto(dto: CreateEstablishmentPhotoUploadDto) {
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException('La photo doit etre une image JPG, PNG ou WebP.');
    }
  }

  private computeCompletionScore(data: Record<string, any>) {
    const fields = [
      data.name,
      data.type,
      data.city,
      data.country,
      data.sector,
      data.patientType,
      data.softwareUsed,
      data.hasSecretary,
      data.averagePatientsPerDay,
      data.isMultidisciplinary,
      data.equipmentAvailable,
      data.mobilityOptions,
      data.acceptedMissionTypes,
      data.minimumCompensation,
      data.preferredDurations,
      data.acceptedPatientTypes,
      data.knownSoftware,
      data.address,
      data.email,
      data.phone,
      data.website,
      data.description,
      data.photos,
    ];

    if (data.hasSecretary === true) {
      fields.push(data.secretaryType);
    }

    return calculateCompletionScore(fields);
  }
}
