import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstablishmentMemberRole, UserRole } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_MANAGE_ROLES = [
  EstablishmentMemberRole.OWNER,
  EstablishmentMemberRole.ADMIN,
  EstablishmentMemberRole.RECRUITER,
];

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureEstablishmentMember(
    userId: string,
    establishmentId: string,
    allowedRoles: EstablishmentMemberRole[] = DEFAULT_MANAGE_ROLES,
  ) {
    const member = await this.prisma.establishmentMember.findFirst({
      where: {
        userId,
        establishmentId,
        role: { in: allowedRoles },
      },
    });

    if (!member) {
      throw new ForbiddenException('Vous n’êtes pas autorisé sur cet établissement.');
    }

    return member;
  }

  async ensureMissionManager(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }

    await this.ensureEstablishmentMember(userId, mission.establishmentId);
    return mission;
  }

  async ensureConversationParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { userId, conversationId },
    });

    if (!participant) {
      throw new ForbiddenException('Vous n’avez pas accès à cette conversation.');
    }

    return participant;
  }

  async ensureCanViewDocument(user: RequestUser, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }

    if (document.userId === user.id) {
      return document;
    }

    if (
  user.role === UserRole.MEDILINK_ADMIN ||
  user.role === UserRole.MEDILINK_SUPPORT
) {
      return document;
    }

    const linkedApplication = await this.prisma.application.findFirst({
      where: {
        candidateUserId: document.userId,
        mission: {
          establishment: {
            members: {
              some: { userId: user.id },
            },
          },
        },
      },
    });

    if (linkedApplication) {
      return document;
    }

    throw new ForbiddenException('Vous n’avez pas accès à ce document.');
  }
}
