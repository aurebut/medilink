import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AgreementEventType,
  ApplicationStatus,
  CompensationMode,
  EscrowPaymentStatus,
  InvoiceType,
  MessageType,
  MissionAgreementStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationEventsService } from './conversation-events.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendProposalDto } from './dto/workflow-action.dto';

const WORKFLOW_PREFIX = '__MEDILINK_WORKFLOW__';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly events: ConversationEventsService,
  ) {}

  async list(user: RequestUser) {
    return this.prisma.conversation.findMany({
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
        application: true,
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
    });
  }

  async get(user: RequestUser, conversationId: string) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        mission: true,
        application: true,
        establishment: true,
        participants: true,
        agreements: { orderBy: { createdAt: 'desc' }, include: { payment: true, invoices: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation introuvable.');
    }

    return conversation;
  }

  async messages(user: RequestUser, conversationId: string) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);

    return this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      include: { sender: { select: { id: true, email: true, role: true, profile: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async sendMessage(user: RequestUser, conversationId: string, dto: SendMessageDto) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);

    if (dto.clientRequestId) {
      const existing = await this.prisma.message.findFirst({
        where: {
          conversationId,
          senderUserId: user.id,
          clientRequestId: dto.clientRequestId,
          deletedAt: null,
        },
      });

      if (existing) return existing;
    }

    let message;
    try {
      message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            conversationId,
            senderUserId: user.id,
            clientRequestId: dto.clientRequestId,
            body: dto.body,
            messageType: MessageType.TEXT,
          },
        });

        await tx.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        return created;
      });
    } catch (error) {
      if (dto.clientRequestId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.message.findFirst({
          where: {
            conversationId,
            senderUserId: user.id,
            clientRequestId: dto.clientRequestId,
            deletedAt: null,
          },
        });
        if (existing) return existing;
      }
      throw error;
    }

    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    await this.audit.log({
      actorUserId: user.id,
      action: 'message.created',
      entityType: 'message',
      entityId: message.id,
      metadata: { conversationId },
    });

    return message;
  }

  async sendProposal(user: RequestUser, conversationId: string, dto: SendProposalDto) {
    const conversation = await this.ensureRecruiterForConversation(user, conversationId);
    if (dto.compensationMode && dto.compensationMode !== CompensationMode.RETROCESSION) {
      throw new BadRequestException("Seule la retrocession d'honoraires est autorisee pour une proposition.");
    }

    const compensationMode = CompensationMode.RETROCESSION;
    const amount = 0;
    const retrocessionPercentage = dto.retrocessionPercentage || conversation.mission.retrocessionPercentage;

    if (!retrocessionPercentage) {
      throw new BadRequestException('Le pourcentage de retrocession est requis.');
    }

    const agreement = await this.prisma.missionAgreement.create({
      data: {
        applicationId: conversation.applicationId,
        conversationId,
        missionId: conversation.missionId,
        candidateUserId: conversation.candidateUserId,
        establishmentId: conversation.establishmentId,
        compensationMode,
        retrocessionPercentage,
        amount,
        currency: dto.currency || conversation.mission.compensationCurrency || 'EUR',
        candidateAmount: amount,
        startDate: this.optionalDate(dto.startDate) || conversation.mission.startDate,
        endDate: this.optionalDate(dto.endDate) || conversation.mission.endDate,
        startTime: dto.startTime || conversation.mission.startTime,
        endTime: dto.endTime || conversation.mission.endTime,
        terms: dto.notes,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        events: {
          create: {
            conversationId,
            actorUserId: user.id,
            type: AgreementEventType.PROPOSAL_SENT,
          },
        },
      },
    });

    return this.createWorkflowMessage(user, conversationId, 'FINAL_PROPOSAL', {
      agreementId: agreement.id,
      proposal: this.agreementPayload(agreement),
    });
  }

  async acceptProposal(user: RequestUser, conversationId: string) {
    const conversation = await this.ensureCandidateForConversation(user, conversationId);
    const agreement = await this.findLatestAgreement(conversationId, MissionAgreementStatus.PROPOSED);

    const message = await this.prisma.$transaction(async (tx) => {
      const updatedAgreement = await tx.missionAgreement.update({
        where: { id: agreement.id },
        data: {
          status: MissionAgreementStatus.PAYMENT_REQUIRED,
          acceptedAt: new Date(),
          payment: {
            create: {
              status: EscrowPaymentStatus.REQUIRES_PAYMENT,
              amount: agreement.amount,
              currency: agreement.currency,
            },
          },
          events: {
            create: [
              { conversationId, actorUserId: user.id, type: AgreementEventType.PROPOSAL_ACCEPTED },
              { conversationId, actorUserId: user.id, type: AgreementEventType.PAYMENT_REQUIRED },
            ],
          },
        },
      });

      await tx.application.update({
        where: { id: conversation.applicationId },
        data: { status: ApplicationStatus.ACCEPTED },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: conversation.applicationId,
          oldStatus: conversation.application.status,
          newStatus: ApplicationStatus.ACCEPTED,
          changedByUserId: user.id,
          reason: 'Proposition finale acceptee dans la conversation.',
        },
      });

      return this.createWorkflowMessageTx(tx, user, conversationId, 'PAYMENT_REQUIRED', {
        agreementId: agreement.id,
        proposal: this.agreementPayload(updatedAgreement),
      });
    });

    await this.notifications.notifyApplicationStatusChanged(conversation.applicationId, ApplicationStatus.ACCEPTED);
    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  async rejectProposal(user: RequestUser, conversationId: string) {
    const conversation = await this.ensureCandidateForConversation(user, conversationId);
    const agreement = await this.findLatestAgreement(conversationId, MissionAgreementStatus.PROPOSED);

    const message = await this.prisma.$transaction(async (tx) => {
      await tx.missionAgreement.update({
        where: { id: agreement.id },
        data: {
          status: MissionAgreementStatus.REJECTED,
          events: {
            create: {
              conversationId,
              actorUserId: user.id,
              type: AgreementEventType.PROPOSAL_REJECTED,
            },
          },
        },
      });

      await tx.application.update({
        where: { id: conversation.applicationId },
        data: { status: ApplicationStatus.REJECTED },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: conversation.applicationId,
          oldStatus: conversation.application.status,
          newStatus: ApplicationStatus.REJECTED,
          changedByUserId: user.id,
          reason: 'Proposition finale refusee dans la conversation.',
        },
      });

      return this.createWorkflowMessageTx(tx, user, conversationId, 'PROPOSAL_REJECTED', {
        agreementId: agreement.id,
      });
    });

    await this.notifications.notifyApplicationStatusChanged(conversation.applicationId, ApplicationStatus.REJECTED);
    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  async securePayment(user: RequestUser, conversationId: string) {
    await this.ensureRecruiterForConversation(user, conversationId);
    const agreement = await this.findLatestAgreement(conversationId, MissionAgreementStatus.PAYMENT_REQUIRED);

    const message = await this.prisma.$transaction(async (tx) => {
      const updatedAgreement = await tx.missionAgreement.update({
        where: { id: agreement.id },
        data: {
          status: MissionAgreementStatus.FUNDS_SECURED,
          payment: {
            update: {
              status: EscrowPaymentStatus.SECURED,
              providerRef: `mock_${Date.now()}`,
              securedAt: new Date(),
            },
          },
          events: {
            create: {
              conversationId,
              actorUserId: user.id,
              type: AgreementEventType.FUNDS_SECURED,
            },
          },
        },
      });

      return this.createWorkflowMessageTx(tx, user, conversationId, 'FUNDS_SECURED', {
        agreementId: agreement.id,
        proposal: this.agreementPayload(updatedAgreement),
      });
    });

    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  async markCompleted(user: RequestUser, conversationId: string) {
    await this.ensureRecruiterForConversation(user, conversationId);
    const agreement = await this.findLatestAgreement(conversationId, MissionAgreementStatus.FUNDS_SECURED);

    const message = await this.prisma.$transaction(async (tx) => {
      const updatedAgreement = await tx.missionAgreement.update({
        where: { id: agreement.id },
        data: {
          status: MissionAgreementStatus.COMPLETED,
          completedAt: new Date(),
          events: {
            create: {
              conversationId,
              actorUserId: user.id,
              type: AgreementEventType.MISSION_COMPLETED,
            },
          },
        },
      });

      return this.createWorkflowMessageTx(tx, user, conversationId, 'MISSION_COMPLETED', {
        agreementId: agreement.id,
        proposal: this.agreementPayload(updatedAgreement),
      });
    });

    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  async releasePayment(user: RequestUser, conversationId: string) {
    await this.ensureRecruiterForConversation(user, conversationId);
    const agreement = await this.findLatestAgreement(conversationId, MissionAgreementStatus.COMPLETED);

    const message = await this.prisma.$transaction(async (tx) => {
      const updatedAgreement = await tx.missionAgreement.update({
        where: { id: agreement.id },
        data: {
          status: MissionAgreementStatus.PAYMENT_RELEASED,
          payment: {
            update: {
              status: EscrowPaymentStatus.RELEASED,
              releasedAt: new Date(),
            },
          },
          events: {
            create: {
              conversationId,
              actorUserId: user.id,
              type: AgreementEventType.PAYMENT_RELEASED,
            },
          },
        },
      });

      return this.createWorkflowMessageTx(tx, user, conversationId, 'PAYMENT_RELEASED', {
        agreementId: agreement.id,
        proposal: this.agreementPayload(updatedAgreement),
      });
    });

    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  async generateInvoices(user: RequestUser, conversationId: string) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);
    const agreement = await this.findLatestAgreement(conversationId, MissionAgreementStatus.PAYMENT_RELEASED);
    const payment = await this.prisma.escrowPayment.findUnique({ where: { agreementId: agreement.id } });

    const message = await this.prisma.$transaction(async (tx) => {
      const count = await tx.invoice.count();
      await tx.invoice.createMany({
        data: [
          {
            agreementId: agreement.id,
            paymentId: payment?.id,
            type: InvoiceType.RECRUITER_INVOICE,
            number: `ML-R-${String(count + 1).padStart(6, '0')}`,
            amount: agreement.amount,
            currency: agreement.currency,
          },
          {
            agreementId: agreement.id,
            paymentId: payment?.id,
            type: InvoiceType.CANDIDATE_RECEIPT,
            number: `ML-C-${String(count + 2).padStart(6, '0')}`,
            amount: agreement.candidateAmount,
            currency: agreement.currency,
          },
        ],
        skipDuplicates: true,
      });

      await tx.agreementEvent.create({
        data: {
          agreementId: agreement.id,
          conversationId,
          actorUserId: user.id,
          type: AgreementEventType.INVOICES_GENERATED,
        },
      });

      return this.createWorkflowMessageTx(tx, user, conversationId, 'INVOICES_GENERATED', {
        agreementId: agreement.id,
        proposal: this.agreementPayload(agreement),
      });
    });

    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  async markAsRead(user: RequestUser, conversationId: string) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);

    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      data: { lastReadAt: new Date() },
    });
  }

  async archive(user: RequestUser, conversationId: string) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);

    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      data: { archivedAt: new Date() },
    });
  }

  private async ensureCandidateForConversation(user: RequestUser, conversationId: string) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { application: true, mission: true, establishment: true },
    });

    if (!conversation) throw new NotFoundException('Conversation introuvable.');
    if (conversation.candidateUserId !== user.id || user.role !== UserRole.CANDIDATE) {
      throw new ForbiddenException('Seul le candidat peut realiser cette action.');
    }

    return conversation;
  }

  private async ensureRecruiterForConversation(user: RequestUser, conversationId: string) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { application: true, mission: true, establishment: true },
    });

    if (!conversation) throw new NotFoundException('Conversation introuvable.');
    await this.permissions.ensureEstablishmentMember(user.id, conversation.establishmentId);

    return conversation;
  }

  private async findLatestAgreement(conversationId: string, status: MissionAgreementStatus) {
    const agreement = await this.prisma.missionAgreement.findFirst({
      where: { conversationId, status },
      orderBy: { createdAt: 'desc' },
    });

    if (!agreement) {
      throw new NotFoundException('Aucun accord de mission compatible avec cette action.');
    }

    return agreement;
  }

  private optionalDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private agreementPayload(agreement: {
    id: string;
    amount: number;
    currency: string;
    compensationMode?: CompensationMode | null;
    retrocessionPercentage?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
    startTime?: string | null;
    endTime?: string | null;
    terms?: string | null;
  }) {
    return {
      id: agreement.id,
      amount: agreement.amount,
      currency: agreement.currency,
      compensationMode: agreement.compensationMode,
      retrocessionPercentage: agreement.retrocessionPercentage,
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      startTime: agreement.startTime,
      endTime: agreement.endTime,
      notes: agreement.terms,
    };
  }

  private async createWorkflowMessage(
    user: RequestUser,
    conversationId: string,
    kind: string,
    data: Record<string, unknown>,
  ) {
    const message = await this.prisma.$transaction((tx) =>
      this.createWorkflowMessageTx(tx, user, conversationId, kind, data),
    );

    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  private async createWorkflowMessageTx(
    tx: any,
    user: RequestUser,
    conversationId: string,
    kind: string,
    data: Record<string, unknown>,
  ) {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderUserId: user.id,
        messageType: MessageType.SYSTEM,
        body: `${WORKFLOW_PREFIX}${JSON.stringify({ kind, ...data })}`,
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: `conversation.workflow.${kind.toLowerCase()}`,
      entityType: 'conversation',
      entityId: conversationId,
      metadata: { kind },
    });

    return created;
  }
}
