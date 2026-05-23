import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  DocumentType,
  DocumentVerificationStatus,
  MessageType,
  MissionStatus,
  UserRole,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ApplyDto } from './dto/apply.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const ALLOWED_APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: [
    ApplicationStatus.VIEWED,
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  VIEWED: [
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  ACCEPTED: [ApplicationStatus.CANCELLED],
  REJECTED: [],
  WITHDRAWN: [],
  CANCELLED: [],
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly permissions: PermissionsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async apply(user: RequestUser, missionId: string, dto: ApplyDto) {
    if (user.role !== UserRole.CANDIDATE) {
      throw new ForbiddenException('Seuls les candidats peuvent postuler.');
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        establishment: { include: { members: true } },
      },
    });

    if (!mission || mission.status !== MissionStatus.PUBLISHED) {
      throw new NotFoundException('Mission introuvable ou indisponible.');
    }

    await this.profiles.assertMinimumCompletion(user.id, 40);

    const existing = await this.prisma.application.findUnique({
      where: {
        missionId_candidateUserId: {
          missionId,
          candidateUserId: user.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Vous avez déjà postulé à cette mission.');
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
    const candidateArticle = profile?.candidateGender === 'FEMININE' ? 'La candidate' : 'Le candidat';
    const recruiterUserId = mission.createdById;

    const result = await this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          missionId,
          candidateUserId: user.id,
          coverMessage: dto.coverMessage,
          status: ApplicationStatus.SUBMITTED,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          oldStatus: null,
          newStatus: ApplicationStatus.SUBMITTED,
          changedByUserId: user.id,
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          missionId,
          applicationId: application.id,
          candidateUserId: user.id,
          establishmentId: mission.establishmentId,
          lastMessageAt: new Date(),
        },
      });

      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, userId: user.id },
          { conversationId: conversation.id, userId: recruiterUserId },
        ],
        skipDuplicates: true,
      });

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId: user.id,
          messageType: MessageType.SYSTEM,
          body: `${candidateArticle} a postule a la mission.`,
        },
      });

      return { application, conversation };
    });

    await this.notifications.notifyApplicationReceived(result.application.id);
    await this.audit.log({
      actorUserId: user.id,
      action: 'application.created',
      entityType: 'application',
      entityId: result.application.id,
      metadata: { missionId },
    });

    return result;
  }

  async listMine(user: RequestUser) {
    return this.prisma.application.findMany({
      where: { candidateUserId: user.id },
      include: { mission: { include: { establishment: true } }, conversation: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForEstablishment(user: RequestUser, establishmentId: string) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId);

    return this.prisma.application.findMany({
      where: { mission: { establishmentId } },
      include: {
        mission: true,
        candidate: { include: { profile: true } },
        conversation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }



  async getCandidateProfileForApplication(user: RequestUser, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        missionId: true,
        candidateUserId: true,
        status: true,
        coverMessage: true,
        createdAt: true,
        updatedAt: true,
        mission: {
          select: {
            id: true,
            establishmentId: true,
            createdById: true,
            title: true,
            description: true,
            missionType: true,
            specialty: true,
            requiredLevel: true,
            requiredLevels: true,
            location: true,
            city: true,
            startDate: true,
            endDate: true,
            startTime: true,
            endTime: true,
            durationHours: true,
            compensationMode: true,
            retrocessionPercentage: true,
            compensationAmount: true,
            compensationCurrency: true,
            status: true,
            publishedAt: true,
            archivedAt: true,
            createdAt: true,
            updatedAt: true,
            tags: true,
            establishment: true,
          },
        },
        conversation: {
          select: {
            id: true,
            missionId: true,
            applicationId: true,
            candidateUserId: true,
            establishmentId: true,
            lastMessageAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        candidate: {
          select: {
            id: true,
            email: true,
            phone: true,
            phoneVerified: true,
            role: true,
            status: true,
            emailVerified: true,
            createdAt: true,
            profile: {
              include: {
                userSkills: {
                  include: { skill: true },
                },
              },
            },
            documents: {
              where: {
                verificationStatus: DocumentVerificationStatus.APPROVED,
                documentType: { not: DocumentType.MESSAGE_ATTACHMENT },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Candidature introuvable.');
    }

    await this.permissions.ensureEstablishmentMember(user.id, application.mission.establishmentId);

    await this.audit.log({
      actorUserId: user.id,
      action: 'candidate_profile.viewed',
      entityType: 'application',
      entityId: application.id,
      metadata: {
        candidateUserId: application.candidateUserId,
        missionId: application.missionId,
      },
    });

    return {
      application,
      mission: application.mission,
      candidate: application.candidate,
      conversation: application.conversation,
    };
  }

  async updateStatus(user: RequestUser, applicationId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { mission: true },
    });

    if (!application) {
      throw new NotFoundException('Candidature introuvable.');
    }

    await this.permissions.ensureEstablishmentMember(user.id, application.mission.establishmentId);

    const allowed = ALLOWED_APPLICATION_TRANSITIONS[application.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition de statut impossible : ${application.status} → ${dto.status}.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: { status: dto.status },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          oldStatus: application.status,
          newStatus: dto.status,
          changedByUserId: user.id,
          reason: dto.reason,
        },
      });

      return updatedApplication;
    });

    await this.notifications.notifyApplicationStatusChanged(application.id, dto.status);
    await this.audit.log({
      actorUserId: user.id,
      action: 'application.status_changed',
      entityType: 'application',
      entityId: application.id,
      metadata: { oldStatus: application.status, newStatus: dto.status },
    });

    return updated;
  }

  async withdraw(user: RequestUser, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Candidature introuvable.');
    }

    if (application.candidateUserId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez retirer que vos candidatures.');
    }

    const allowed = ALLOWED_APPLICATION_TRANSITIONS[application.status] || [];
    if (!allowed.includes(ApplicationStatus.WITHDRAWN)) {
      throw new BadRequestException('Cette candidature ne peut plus être retirée.');
    }

    const updated = await this.prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.WITHDRAWN },
    });

    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: application.status,
        newStatus: ApplicationStatus.WITHDRAWN,
        changedByUserId: user.id,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'application.withdrawn',
      entityType: 'application',
      entityId: application.id,
    });

    return updated;
  }
}
