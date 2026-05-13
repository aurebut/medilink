import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstablishmentMemberRole } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';

@Injectable()
export class EstablishmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
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

    return establishment;
  }

  async listMine(userId: string) {
    return this.prisma.establishment.findMany({
      where: { members: { some: { userId } } },
      include: { members: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(user: RequestUser, establishmentId: string, dto: Partial<CreateEstablishmentDto>) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
    ]);

    const updated = await this.prisma.establishment.update({
      where: { id: establishmentId },
      data: dto,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'establishment.updated',
      entityType: 'establishment',
      entityId: updated.id,
    });

    return updated;
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
}
