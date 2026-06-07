import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstablishmentMemberRole } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { DocumentsService } from '../documents/documents.service';
import { EstablishmentsService } from '../establishments/establishments.service';
import { MissionsService } from '../missions/missions.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly establishments: EstablishmentsService,
    private readonly missions: MissionsService,
    private readonly permissions: PermissionsService,
    private readonly profiles: ProfilesService,
  ) {}

  async getCandidateDashboard(user: RequestUser) {
    const [profile, documents, applications, conversations, notifications] = await Promise.all([
      this.profiles.getMyProfile(user.id),
      this.documents.listMine(user.id),
      this.prisma.application.findMany({
        where: { candidateUserId: user.id },
        include: { mission: { include: { establishment: true } }, conversation: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: user.id,
              archivedAt: null,
            },
          },
        },
        include: {
          mission: true,
          application: { include: { candidate: { include: { profile: true } } } },
          establishment: true,
          participants: true,
          agreements: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { payment: true, invoices: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return { profile, documents, applications, conversations, notifications };
  }

  async getEstablishmentDashboard(user: RequestUser, establishmentId?: string) {
    const establishment = establishmentId
      ? await this.getManagedEstablishment(user, establishmentId)
      : await this.getPrimaryEstablishment(user);

    if (!establishment) {
      return {
        establishment: null,
        applications: [],
        missions: [],
        conversations: [],
      };
    }

    const [applications, missions, conversations] = await Promise.all([
      this.prisma.application.findMany({
        where: { mission: { establishmentId: establishment.id } },
        include: {
          mission: true,
          candidate: { include: { profile: true } },
          conversation: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.missions.findMine(user, establishment.id),
      this.prisma.conversation.findMany({
        where: {
          establishmentId: establishment.id,
          participants: {
            some: {
              userId: user.id,
              archivedAt: null,
            },
          },
        },
        include: {
          mission: true,
          application: { include: { candidate: { include: { profile: true } } } },
          establishment: true,
          participants: true,
          agreements: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { payment: true, invoices: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
    ]);

    return { establishment, applications, missions, conversations };
  }

  private async getPrimaryEstablishment(user: RequestUser) {
    const establishments = await this.establishments.listMine(user.id);
    return establishments[0] || null;
  }

  private async getManagedEstablishment(user: RequestUser, establishmentId: string) {
    if (!establishmentId) throw new BadRequestException('Un etablissement est requis.');

    await this.permissions.ensureEstablishmentMember(user.id, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
      EstablishmentMemberRole.RECRUITER,
    ]);

    const establishments = await this.establishments.listMine(user.id);
    const establishment = establishments.find((item) => item.id === establishmentId);
    if (!establishment) throw new NotFoundException('Etablissement introuvable.');

    return establishment;
  }
}
