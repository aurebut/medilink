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
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationEventsService } from './conversation-events.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendProposalDto } from './dto/workflow-action.dto';

const WORKFLOW_PREFIX = '__MEDILINK_WORKFLOW__';
type InvoiceDownloadType = 'recruiter' | 'candidate';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly events: ConversationEventsService,
    private readonly billing: BillingService,
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

      await this.billing.consumePublicationCreditForAcceptedMission(
        conversation.establishmentId,
        conversation.missionId,
        tx,
      );

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

    const message = await this.prisma.$transaction(async (tx) => {
      const invoices = await this.ensureInvoicesTx(tx, agreement);

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
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          type: invoice.type,
          number: invoice.number,
          amount: invoice.amount,
          currency: invoice.currency,
          issuedAt: invoice.issuedAt,
        })),
      });
    });

    await this.notifications.notifyNewMessage(conversationId, user.id);
    await this.events.emitMessageCreated(conversationId, message);
    return message;
  }

  async downloadInvoicePdf(user: RequestUser, conversationId: string, type: InvoiceDownloadType) {
    await this.permissions.ensureConversationParticipant(user.id, conversationId);
    const agreement = await this.findLatestAgreement(conversationId, MissionAgreementStatus.PAYMENT_RELEASED);
    const invoiceType = type === 'recruiter' ? InvoiceType.RECRUITER_INVOICE : InvoiceType.CANDIDATE_RECEIPT;

    const invoice = await this.prisma.$transaction(async (tx) => {
      const invoices = await this.ensureInvoicesTx(tx, agreement);
      return invoices.find((item) => item.type === invoiceType);
    });

    if (!invoice) throw new NotFoundException('Facture introuvable.');

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        mission: true,
        establishment: true,
        application: { include: { candidate: { include: { profile: true } } } },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation introuvable.');

    const candidateProfile = conversation.application.candidate.profile;
    const candidateName = [candidateProfile?.firstName, candidateProfile?.lastName].filter(Boolean).join(' ') || conversation.application.candidate.email;
    const title = type === 'recruiter' ? 'Facture etablissement' : 'Justificatif candidat';
    const fileName = `${invoice.number}-${type === 'recruiter' ? 'facture-etablissement' : 'justificatif-candidat'}.pdf`;
    const buffer = this.buildInvoicePdf([
      title,
      `Numero: ${invoice.number}`,
      `Date d'emission: ${invoice.issuedAt.toLocaleDateString('fr-FR')}`,
      '',
      `Mission: ${conversation.mission.title}`,
      `Etablissement: ${conversation.establishment.name}`,
      `Candidat: ${candidateName}`,
      `Ville: ${conversation.mission.city}`,
      `Date mission: ${agreement.startDate ? agreement.startDate.toLocaleDateString('fr-FR') : '-'}`,
      `Horaire: ${agreement.startTime || '-'}${agreement.endTime ? ` - ${agreement.endTime}` : ''}`,
      '',
      `Mode: ${agreement.compensationMode === CompensationMode.RETROCESSION ? "Retrocession d'honoraires" : 'Montant fixe'}`,
      agreement.retrocessionPercentage ? `Retrocession: ${agreement.retrocessionPercentage}%` : null,
      `Montant: ${invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: invoice.currency })}`,
      '',
      type === 'recruiter'
        ? 'Document genere pour le recruteur apres validation de la mission.'
        : 'Document genere pour le candidat apres validation de la mission.',
      'Medilink - document genere automatiquement.',
    ].filter(Boolean) as string[]);

    return { buffer, fileName };
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

  private async ensureInvoicesTx(tx: any, agreement: {
    id: string;
    amount: number;
    candidateAmount: number;
    currency: string;
  }) {
    const existingInvoices = await tx.invoice.findMany({
      where: { agreementId: agreement.id },
      orderBy: { issuedAt: 'asc' },
    });
    const invoices = [...existingInvoices];
    const payment = await tx.escrowPayment.findUnique({ where: { agreementId: agreement.id } });

    if (!invoices.some((invoice) => invoice.type === InvoiceType.RECRUITER_INVOICE)) {
      const count = await tx.invoice.count();
      invoices.push(await tx.invoice.create({
        data: {
          agreementId: agreement.id,
          paymentId: payment?.id,
          type: InvoiceType.RECRUITER_INVOICE,
          number: `ML-R-${String(count + 1).padStart(6, '0')}`,
          amount: agreement.amount,
          currency: agreement.currency,
        },
      }));
    }

    if (!invoices.some((invoice) => invoice.type === InvoiceType.CANDIDATE_RECEIPT)) {
      const count = await tx.invoice.count();
      invoices.push(await tx.invoice.create({
        data: {
          agreementId: agreement.id,
          paymentId: payment?.id,
          type: InvoiceType.CANDIDATE_RECEIPT,
          number: `ML-C-${String(count + 1).padStart(6, '0')}`,
          amount: agreement.candidateAmount,
          currency: agreement.currency,
        },
      }));
    }

    return invoices.sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());
  }

  private buildInvoicePdf(lines: string[]) {
    const escapePdfText = (value: string) => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\()]/g, '\\$&');
    const textCommands = lines.map((line, index) => {
      const size = index === 0 ? 20 : 11;
      const leading = index === 0 ? 28 : 17;
      const escaped = escapePdfText(line);
      return index === 0
        ? `BT /F1 ${size} Tf 54 770 Td (${escaped}) Tj ET`
        : `BT /F1 ${size} Tf 54 ${770 - 28 - ((index - 1) * leading)} Td (${escaped}) Tj ET`;
    }).join('\n');
    const stream = `${textCommands}\n`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
      `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}endstream endobj\n`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += object;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
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
