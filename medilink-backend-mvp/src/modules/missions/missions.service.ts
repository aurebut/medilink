import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompensationMode, EstablishmentMemberRole, MissionStatus } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../documents/storage.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { SearchMissionsDto } from './dto/search-missions.dto';

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async create(user: RequestUser, dto: CreateMissionDto) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    const requiredLevels = dto.requiredLevels?.length
      ? dto.requiredLevels
      : dto.requiredLevel
        ? [dto.requiredLevel]
        : [];

    if (!requiredLevels.length) {
      throw new BadRequestException('Au moins un type de candidat est requis.');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('La date de début doit être dans le futur.');
    }

    if (endDate && endDate < startDate) {
      throw new BadRequestException('La date de fin doit être après la date de début.');
    }

    if (dto.compensationMode && dto.compensationMode !== CompensationMode.RETROCESSION) {
      throw new BadRequestException("Seule la retrocession d'honoraires est autorisee pour une mission.");
    }

    if (!dto.retrocessionPercentage) {
      throw new BadRequestException('Le pourcentage de retrocession est requis.');
    }

    const establishment = await this.resolveEstablishment(user, dto);

    const mission = await this.prisma.mission.create({
      data: {
        establishmentId: establishment.id,
        createdById: user.id,
        title: dto.title,
        description: dto.description,
        missionType: dto.missionType,
        specialty: dto.specialty,
        requiredLevel: requiredLevels[0],
        requiredLevels,
        location: dto.location,
        city: dto.city,
        sector: dto.sector || establishment.sector,
        patientType: dto.patientType || establishment.patientType,
        softwareUsed: dto.softwareUsed || establishment.softwareUsed,
        hasSecretary: dto.hasSecretary ?? establishment.hasSecretary,
        mobilityOptions: dto.mobilityOptions?.length ? dto.mobilityOptions : establishment.mobilityOptions,
        acceptedMissionTypes: dto.acceptedMissionTypes?.length ? dto.acceptedMissionTypes : establishment.acceptedMissionTypes,
        minimumCompensation: dto.minimumCompensation ?? establishment.minimumCompensation,
        preferredDurations: dto.preferredDurations?.length ? dto.preferredDurations : establishment.preferredDurations,
        refusedSchedules: dto.refusedSchedules?.length ? dto.refusedSchedules : establishment.refusedSchedules,
        acceptedPatientTypes: dto.acceptedPatientTypes?.length ? dto.acceptedPatientTypes : establishment.acceptedPatientTypes,
        knownSoftware: dto.knownSoftware?.length ? dto.knownSoftware : establishment.knownSoftware,
        departmentInfo: dto.departmentInfo,
        teamInfo: dto.teamInfo,
        equipmentInfo: dto.equipmentInfo,
        practicalInfo: dto.practicalInfo,
        accommodationProvided: dto.accommodationProvided,
        parkingAvailable: dto.parkingAvailable,
        startDate,
        endDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        durationHours: dto.durationHours,
        compensationMode: CompensationMode.RETROCESSION,
        retrocessionPercentage: dto.retrocessionPercentage,
        compensationAmount: undefined,
        compensationCurrency: dto.compensationCurrency || 'EUR',
        status: dto.publishNow ? MissionStatus.PUBLISHED : MissionStatus.DRAFT,
        publishedAt: dto.publishNow ? new Date() : undefined,
        tags: dto.tags?.length
          ? {
              create: dto.tags.map((tag) => ({ tag })),
            }
          : undefined,
      },
      include: this.missionInclude,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'mission.created',
      entityType: 'mission',
      entityId: mission.id,
      metadata: { status: mission.status },
    });

    return this.withSignedEstablishmentPhotos(mission);
  }

  private async resolveEstablishment(user: RequestUser, dto: CreateMissionDto) {
    if (!dto.establishmentId) {
      throw new BadRequestException('Un etablissement est requis pour creer une mission.');
    }

    await this.permissions.ensureEstablishmentMember(user.id, dto.establishmentId);
    const establishment = await this.prisma.establishment.findUnique({ where: { id: dto.establishmentId } });

    if (!establishment) {
      throw new BadRequestException('Etablissement introuvable.');
    }

    return establishment;
  }

  async search(dto: SearchMissionsDto) {
    const where: any = {
      status: MissionStatus.PUBLISHED,
    };
    const andFilters: any[] = [];

    if (dto.missionType) where.missionType = dto.missionType;
    if (dto.requiredLevel) {
      andFilters.push({
        OR: [
          { requiredLevel: dto.requiredLevel },
          { requiredLevels: { has: dto.requiredLevel } },
        ],
      });
    }
    if (dto.specialty) where.specialty = { contains: dto.specialty, mode: 'insensitive' };
    if (dto.city) where.city = { contains: dto.city, mode: 'insensitive' };
    if (dto.sector) where.sector = dto.sector;
    if (dto.patientType) where.patientType = { contains: dto.patientType, mode: 'insensitive' };
    if (dto.softwareUsed) where.softwareUsed = { contains: dto.softwareUsed, mode: 'insensitive' };
    if (dto.hasSecretary) where.hasSecretary = dto.hasSecretary === 'true';
    if (dto.dateFrom) where.startDate = { gte: new Date(dto.dateFrom) };
    if (dto.retrocessionMin || dto.retrocessionMax) {
      where.retrocessionPercentage = {
        ...(dto.retrocessionMin ? { gte: dto.retrocessionMin } : {}),
        ...(dto.retrocessionMax ? { lte: dto.retrocessionMax } : {}),
      };
    }

    if (dto.q) {
      andFilters.push({
        OR: [
          { title: { contains: dto.q, mode: 'insensitive' } },
          { description: { contains: dto.q, mode: 'insensitive' } },
          { specialty: { contains: dto.q, mode: 'insensitive' } },
          { city: { contains: dto.q, mode: 'insensitive' } },
          { sector: { contains: dto.q, mode: 'insensitive' } },
          { patientType: { contains: dto.q, mode: 'insensitive' } },
          { softwareUsed: { contains: dto.q, mode: 'insensitive' } },
        ],
      });
    }

    if (andFilters.length) where.AND = andFilters;

    const [items, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        include: this.missionInclude,
        orderBy: { startDate: 'asc' },
        take: dto.limit || 20,
        skip: dto.offset || 0,
      }),
      this.prisma.mission.count({ where }),
    ]);

    return { items: await this.withSignedEstablishmentPhotos(items), total };
  }

  async findMine(user: RequestUser, establishmentId?: string) {
    const manageableRoles = [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
      EstablishmentMemberRole.RECRUITER,
    ];

    if (establishmentId) {
      await this.permissions.ensureEstablishmentMember(user.id, establishmentId, manageableRoles);

      const missions = await this.prisma.mission.findMany({
        where: { establishmentId },
        include: this.missionInclude,
        orderBy: { createdAt: 'desc' },
      });

      return this.withSignedEstablishmentPhotos(missions);
    }

    const missions = await this.prisma.mission.findMany({
      where: {
        establishment: {
          members: {
            some: {
              userId: user.id,
              role: { in: manageableRoles },
            },
          },
        },
      },
      include: this.missionInclude,
      orderBy: { createdAt: 'desc' },
    });

    return this.withSignedEstablishmentPhotos(missions);
  }

  async getMine(user: RequestUser, missionId: string) {
    await this.permissions.ensureMissionManager(user.id, missionId);

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: this.missionInclude,
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }

    return this.withSignedEstablishmentPhotos(mission);
  }

  async getPublic(id: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: this.missionInclude,
    });

    if (!mission || mission.status !== MissionStatus.PUBLISHED) {
      throw new NotFoundException('Mission introuvable.');
    }

    return this.withSignedEstablishmentPhotos(mission);
  }

  async update(user: RequestUser, missionId: string, dto: Partial<CreateMissionDto>) {
    await this.permissions.ensureMissionManager(user.id, missionId);

    const { tags, publishNow, establishmentId, compensationAmount, ...data } = dto as any;

    if (dto.compensationMode && dto.compensationMode !== CompensationMode.RETROCESSION) {
      throw new BadRequestException("Seule la retrocession d'honoraires est autorisee pour une mission.");
    }

    if (dto.compensationMode === CompensationMode.RETROCESSION && !dto.retrocessionPercentage) {
      throw new BadRequestException('Le pourcentage de retrocession est requis.');
    }

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        ...data,
        compensationMode: dto.compensationMode || dto.retrocessionPercentage ? CompensationMode.RETROCESSION : undefined,
        compensationAmount: dto.compensationMode || dto.retrocessionPercentage ? null : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: this.missionInclude,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'mission.updated',
      entityType: 'mission',
      entityId: missionId,
    });

    return this.withSignedEstablishmentPhotos(updated);
  }

  async setStatus(user: RequestUser, missionId: string, status: MissionStatus) {
    await this.permissions.ensureMissionManager(user.id, missionId);

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        status,
        publishedAt: status === MissionStatus.PUBLISHED ? new Date() : undefined,
        archivedAt: status === MissionStatus.ARCHIVED ? new Date() : undefined,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: `mission.status.${status.toLowerCase()}`,
      entityType: 'mission',
      entityId: missionId,
    });

    return updated;
  }

  async delete(user: RequestUser, missionId: string) {
    const mission = await this.permissions.ensureMissionManager(user.id, missionId);

    await this.prisma.mission.delete({
      where: { id: missionId },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'mission.deleted',
      entityType: 'mission',
      entityId: missionId,
      metadata: { establishmentId: mission.establishmentId, status: mission.status },
    });

    return { deleted: true };
  }

  private get missionInclude() {
    return {
      tags: true,
      establishment: {
        include: {
          photos: {
            where: { uploadedAt: { not: null } },
            orderBy: [
              { isPrimary: 'desc' as const },
              { orderIndex: 'asc' as const },
              { createdAt: 'asc' as const },
            ],
            take: 1,
          },
        },
      },
    };
  }

  private async withSignedEstablishmentPhotos(value: any): Promise<any> {
    if (Array.isArray(value)) {
      return Promise.all(value.map((mission) => this.withSignedEstablishmentPhotos(mission)));
    }

    const mission = value;
    const photos = mission?.establishment?.photos;
    if (!photos?.length) return mission;

    const signedPhotos = await Promise.all(
      photos.map(async (photo: any) => {
        const signed = await this.storage.createDownloadUrl(
          photo.storageKey,
          photo.fileName,
          photo.mimeType,
        );
        return { ...photo, url: signed.downloadUrl };
      }),
    );

    return {
      ...mission,
      establishment: {
        ...mission.establishment,
        photos: signedPhotos,
      },
    };
  }
}
