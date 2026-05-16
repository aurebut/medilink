import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstablishmentMemberRole, EstablishmentType, MissionStatus, UserRole } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
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
  ) {}

  async create(user: RequestUser, dto: CreateMissionDto) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (startDate < new Date()) {
      throw new BadRequestException('La date de début doit être dans le futur.');
    }

    if (endDate && endDate < startDate) {
      throw new BadRequestException('La date de fin doit être après la date de début.');
    }

    const establishmentId = await this.resolveEstablishmentId(user, dto);

    const mission = await this.prisma.mission.create({
      data: {
        establishmentId,
        createdById: user.id,
        title: dto.title,
        description: dto.description,
        missionType: dto.missionType,
        specialty: dto.specialty,
        requiredLevel: dto.requiredLevel,
        location: dto.location,
        city: dto.city,
        startDate,
        endDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        durationHours: dto.durationHours,
        compensationAmount: dto.compensationAmount,
        compensationCurrency: dto.compensationCurrency || 'EUR',
        status: dto.publishNow ? MissionStatus.PUBLISHED : MissionStatus.DRAFT,
        publishedAt: dto.publishNow ? new Date() : undefined,
        tags: dto.tags?.length
          ? {
              create: dto.tags.map((tag) => ({ tag })),
            }
          : undefined,
      },
      include: { tags: true, establishment: true },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'mission.created',
      entityType: 'mission',
      entityId: mission.id,
      metadata: { status: mission.status },
    });

    return mission;
  }

  private async resolveEstablishmentId(user: RequestUser, dto: CreateMissionDto) {
    if (dto.establishmentId) {
      await this.permissions.ensureEstablishmentMember(user.id, dto.establishmentId);
      return dto.establishmentId;
    }

    const establishmentRoles: UserRole[] = [
      UserRole.ESTABLISHMENT_OWNER,
      UserRole.ESTABLISHMENT_ADMIN,
      UserRole.ESTABLISHMENT_RECRUITER,
    ];

    if (!establishmentRoles.includes(user.role)) {
      throw new BadRequestException('Un etablissement est requis pour creer une mission.');
    }

    const existingMembership = await this.prisma.establishmentMember.findFirst({
      where: {
        userId: user.id,
        role: {
          in: [
            EstablishmentMemberRole.OWNER,
            EstablishmentMemberRole.ADMIN,
            EstablishmentMemberRole.RECRUITER,
          ],
        },
      },
      include: { establishment: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existingMembership) {
      return existingMembership.establishmentId;
    }

    const defaultName = user.email
      ? `Etablissement ${user.email.split('@')[0]}`
      : 'Etablissement Medilink';

    const created = await this.prisma.$transaction(async (tx) => {
      const establishment = await tx.establishment.create({
        data: {
          name: defaultName,
          type: EstablishmentType.OTHER,
          city: dto.city,
          email: user.email,
        },
      });

      await tx.establishmentMember.create({
        data: {
          establishmentId: establishment.id,
          userId: user.id,
          role: EstablishmentMemberRole.OWNER,
        },
      });

      return establishment;
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.auto_created',
      entityType: 'establishment',
      entityId: created.id,
    });

    return created.id;
  }

  async search(dto: SearchMissionsDto) {
    const where: any = {
      status: MissionStatus.PUBLISHED,
    };

    if (dto.missionType) where.missionType = dto.missionType;
    if (dto.requiredLevel) where.requiredLevel = dto.requiredLevel;
    if (dto.specialty) where.specialty = { contains: dto.specialty, mode: 'insensitive' };
    if (dto.city) where.city = { contains: dto.city, mode: 'insensitive' };
    if (dto.dateFrom) where.startDate = { gte: new Date(dto.dateFrom) };

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
        { specialty: { contains: dto.q, mode: 'insensitive' } },
        { city: { contains: dto.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        include: { tags: true, establishment: true },
        orderBy: { startDate: 'asc' },
        take: dto.limit || 20,
        skip: dto.offset || 0,
      }),
      this.prisma.mission.count({ where }),
    ]);

    return { items, total };
  }

  async getPublic(id: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: { tags: true, establishment: true },
    });

    if (!mission || mission.status !== MissionStatus.PUBLISHED) {
      throw new NotFoundException('Mission introuvable.');
    }

    return mission;
  }

  async update(user: RequestUser, missionId: string, dto: Partial<CreateMissionDto>) {
    await this.permissions.ensureMissionManager(user.id, missionId);

    const { tags, publishNow, establishmentId, ...data } = dto as any;

    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        ...data,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { tags: true, establishment: true },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'mission.updated',
      entityType: 'mission',
      entityId: missionId,
    });

    return updated;
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
}
