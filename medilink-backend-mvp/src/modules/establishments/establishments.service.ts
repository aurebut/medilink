import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountingOwnerType,
  EstablishmentMemberRole,
  UserRole,
} from '@prisma/client';
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
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

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
    if (
      user.role !== UserRole.ESTABLISHMENT_OWNER &&
      user.role !== UserRole.MEDILINK_ADMIN
    ) {
      throw new ForbiddenException(
        'Seul un compte établissement autorisé peut créer un établissement.',
      );
    }

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
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                status: true,
                emailVerified: true,
                phone: true,
                createdAt: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
        photos: this.photoInclude,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(establishments.map((item) => this.withSignedPhotoUrls(item)));
  }

  async update(user: RequestUser, establishmentId: string, dto: UpdateEstablishmentDto) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
    ]);

    const updated = await this.prisma.establishment.update({
      where: { id: establishmentId },
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        sector: dto.sector,
        patientType: dto.patientType,
        softwareUsed: dto.softwareUsed,
        hasSecretary: dto.hasSecretary,
        secretaryType: dto.secretaryType,
        averagePatientsPerDay: dto.averagePatientsPerDay,
        isMultidisciplinary: dto.isMultidisciplinary,
        equipmentAvailable: dto.equipmentAvailable,
        mobilityOptions: dto.mobilityOptions,
        acceptedMissionTypes: dto.acceptedMissionTypes,
        minimumCompensation: dto.minimumCompensation,
        preferredDurations: dto.preferredDurations,
        refusedSchedules: dto.refusedSchedules,
        acceptedPatientTypes: dto.acceptedPatientTypes,
        knownSoftware: dto.knownSoftware,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        description: dto.description,
      },
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
    ]);

    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      include: {
        photos: {
          select: { storageKey: true },
        },
      },
    });

    if (!establishment) {
      throw new NotFoundException('Etablissement introuvable.');
    }

    const [
      missionCount,
      conversationCount,
      publicationCreditCount,
      billingCustomer,
      subscription,
      accountingWorkspace,
    ] = await Promise.all([
      this.prisma.mission.count({ where: { establishmentId } }),
      this.prisma.conversation.count({ where: { establishmentId } }),
      this.prisma.publicationCredit.count({ where: { establishmentId } }),
      this.prisma.billingCustomer.findUnique({
        where: { establishmentId },
        select: { id: true },
      }),
      this.prisma.establishmentSubscription.findUnique({
        where: { establishmentId },
        select: { id: true },
      }),
      this.prisma.accountingWorkspace.findUnique({
        where: {
          ownerType_ownerId: {
            ownerType: AccountingOwnerType.ESTABLISHMENT,
            ownerId: establishmentId,
          },
        },
        select: { id: true },
      }),
    ]);

    if (
      missionCount > 0 ||
      conversationCount > 0 ||
      publicationCreditCount > 0 ||
      billingCustomer ||
      subscription ||
      accountingWorkspace
    ) {
      throw new ConflictException(
        'Un etablissement ayant un historique operationnel ou financier ne peut pas etre supprime.',
      );
    }

    await Promise.all(
      establishment.photos.map((photo) =>
        this.storage.deleteObject(photo.storageKey),
      ),
    );

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
    const actorMembership = await this.permissions.ensureEstablishmentMember(
      user.id,
      establishmentId,
      [EstablishmentMemberRole.OWNER, EstablishmentMemberRole.ADMIN],
    );

    if (dto.role === EstablishmentMemberRole.OWNER) {
      throw new ForbiddenException('Impossible d’ajouter un propriétaire via cette route.');
    }
    if (
      actorMembership.role === EstablishmentMemberRole.ADMIN &&
      dto.role === EstablishmentMemberRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Seul le propriétaire peut nommer un autre administrateur.',
      );
    }

    const memberUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!memberUser) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (memberUser.role === UserRole.CANDIDATE) {
      throw new ForbiddenException(
        'Un compte candidat ne peut pas recevoir un rôle établissement.',
      );
    }

    const existingMembership = await this.prisma.establishmentMember.findUnique({
      where: {
        establishmentId_userId: {
          establishmentId,
          userId: memberUser.id,
        },
      },
    });

    if (existingMembership?.role === EstablishmentMemberRole.OWNER) {
      throw new ForbiddenException(
        'Le rôle du propriétaire ne peut pas être modifié via cette route.',
      );
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

  async removeMember(user: RequestUser, establishmentId: string, memberId: string) {
    const actorMembership = await this.permissions.ensureEstablishmentMember(
      user.id,
      establishmentId,
      [EstablishmentMemberRole.OWNER, EstablishmentMemberRole.ADMIN],
    );
    const member = await this.prisma.establishmentMember.findFirst({
      where: { id: memberId, establishmentId },
    });

    if (!member) {
      throw new NotFoundException('Membre introuvable.');
    }
    if (member.role === EstablishmentMemberRole.OWNER) {
      throw new ForbiddenException('Le propriétaire ne peut pas être retiré de son établissement.');
    }
    if (
      actorMembership.role === EstablishmentMemberRole.ADMIN &&
      member.role === EstablishmentMemberRole.ADMIN
    ) {
      throw new ForbiddenException('Seul le propriétaire peut retirer un administrateur.');
    }
    if (member.userId === user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas retirer votre propre accès depuis cet écran.',
      );
    }

    await this.prisma.establishmentMember.delete({ where: { id: member.id } });
    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.member_removed',
      entityType: 'establishment',
      entityId: establishmentId,
      metadata: { memberUserId: member.userId, role: member.role },
    });

    return { removed: true };
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

    const safeFileName =
      dto.fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+/, '') || 'photo';
    const storageKey =
      `quarantine/establishments/${establishmentId}/${randomUUID()}-${safeFileName}`;

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

    if (photo.uploadedAt) {
      throw new ConflictException('Cette photo a deja ete confirmee.');
    }

    const finalStorageKey =
      `validated/establishments/${establishmentId}/${photo.id}-${photo.fileName}`;

    try {
      await this.storage.promoteUploadedObject(photo.storageKey, finalStorageKey);
    } catch {
      // A previous attempt may already have copied the object before failing
      // while deleting the quarantine copy.
    }

    try {
      await this.storage.assertUploadedObject(
        finalStorageKey,
        photo.mimeType,
        photo.sizeBytes,
      );
    } catch {
      await this.storage.deleteObject(finalStorageKey).catch(() => undefined);
      throw new BadRequestException(
        'La photo est absente, incomplete ou ne correspond pas au type declare.',
      );
    }

    const existingUploaded = await this.prisma.establishmentPhoto.count({
      where: { establishmentId, uploadedAt: { not: null } },
    });

    const claimed = await this.prisma.establishmentPhoto.updateMany({
      where: {
        id: photo.id,
        establishmentId,
        storageKey: photo.storageKey,
        uploadedAt: null,
      },
      data: {
        storageKey: finalStorageKey,
        uploadedAt: new Date(),
        isPrimary: existingUploaded === 0 ? true : photo.isPrimary,
      },
    });

    if (claimed.count !== 1) {
      throw new ConflictException('Cette photo a deja ete confirmee.');
    }

    const updated = await this.prisma.establishmentPhoto.findUniqueOrThrow({
      where: { id: photo.id },
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
    const photo = await this.findPhoto(establishmentId, photoId);
    if (!photo.uploadedAt) {
      throw new BadRequestException('Cette photo doit etre confirmee avant publication.');
    }

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

    await this.storage.deleteObject(photo.storageKey);
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
