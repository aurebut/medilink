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
    }, {
      maxWait: 5000,
      timeout: 15000,
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
    }, {
      maxWait: 5000,
      timeout: 15000,
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
    }, {
      maxWait: 5000,
      timeout: 15000,
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
    }, {
      maxWait: 5000,
      timeout: 15000,
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
    }, {
      maxWait: 5000,
      timeout: 15000,
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
    }, {
      maxWait: 5000,
      timeout: 15000,
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
    }, {
      maxWait: 5000,
      timeout: 15000,
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
    const title = type === 'recruiter' ? 'Facture de retrocession' : 'Justificatif de retrocession';
    const fileName = `${invoice.number}-${type === 'recruiter' ? 'facture-etablissement' : 'justificatif-candidat'}.pdf`;
    const buffer = this.buildInvoicePdf({
      type,
      title,
      number: invoice.number,
      issuedAt: invoice.issuedAt,
      amount: invoice.amount,
      currency: invoice.currency,
      missionTitle: conversation.mission.title,
      establishmentName: conversation.establishment.name,
      establishmentAddress: [conversation.establishment.address, conversation.establishment.city, conversation.establishment.country].filter(Boolean).join(', '),
      candidateName,
      candidateReference: candidateProfile?.rpps ? `RPPS ${candidateProfile.rpps}` : conversation.application.candidate.email,
      city: conversation.mission.city,
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      startTime: agreement.startTime,
      endTime: agreement.endTime,
      compensationMode: agreement.compensationMode,
      retrocessionPercentage: agreement.retrocessionPercentage,
    });

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

  private buildInvoicePdf(data: {
    type: InvoiceDownloadType;
    title: string;
    number: string;
    issuedAt: Date;
    amount: number;
    currency: string;
    missionTitle: string;
    establishmentName: string;
    establishmentAddress: string;
    candidateName: string;
    candidateReference: string;
    city: string;
    startDate?: Date | null;
    endDate?: Date | null;
    startTime?: string | null;
    endTime?: string | null;
    compensationMode: CompensationMode;
    retrocessionPercentage?: number | null;
  }) {
    const commands: string[] = [];
    const safe = (value: unknown, maxLength = 90) => String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/[\\()]/g, '\\$&')
      .slice(0, maxLength);
    const color = (hex: string) => {
      const clean = hex.replace('#', '');
      return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255)
        .map((value) => value.toFixed(3)).join(' ');
    };
    const rect = (x: number, y: number, width: number, height: number, fill: string, radius = 0) => {
      const fillColor = color(fill);
      if (!radius) {
        commands.push(`${fillColor} rg ${x} ${y} ${width} ${height} re f`);
        return;
      }
      const r = Math.min(radius, width / 2, height / 2);
      const k = 0.5522847498;
      commands.push(`${fillColor} rg ${x + r} ${y} m ${x + width - r} ${y} l ${x + width - r + r * k} ${y} ${x + width} ${y + r - r * k} ${x + width} ${y + r} c ${x + width} ${y + height - r} l ${x + width} ${y + height - r + r * k} ${x + width - r + r * k} ${y + height} ${x + width - r} ${y + height} c ${x + r} ${y + height} l ${x + r - r * k} ${y + height} ${x} ${y + height - r + r * k} ${x} ${y + height - r} c ${x} ${y + r} l ${x} ${y + r - r * k} ${x + r - r * k} ${y} ${x + r} ${y} c f`);
    };
    const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) => {
      commands.push(`${color(stroke)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
    };
    const text = (value: unknown, x: number, y: number, size = 10, fill = '#243145', font: 'F1' | 'F2' = 'F1', align: 'left' | 'right' = 'left', maxLength = 90) => {
      const content = safe(value, maxLength);
      const estimatedWidth = content.length * size * (font === 'F2' ? 0.55 : 0.5);
      const targetX = align === 'right' ? x - estimatedWidth : x;
      commands.push(`BT /${font} ${size} Tf ${color(fill)} rg ${targetX.toFixed(1)} ${y} Td (${content}) Tj ET`);
    };
    const formatDate = (value?: Date | null) => value ? value.toLocaleDateString('fr-FR') : '-';
    const formatAmount = (amount: number) => amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    rect(0, 687, 595, 155, '#102A43');
    rect(0, 687, 12, 155, '#15B8A6');
    text('Medi', 46, 782, 25, '#FFFFFF', 'F2');
    text('Link', 102, 782, 25, '#15B8A6', 'F2');
    text('REMPLACEMENTS MEDICAUX', 47, 760, 8, '#A9C3D6', 'F2');
    text(data.title.toUpperCase(), 548, 790, 17, '#FFFFFF', 'F2', 'right');
    text(`N. ${data.number}`, 548, 766, 10, '#C9D8E5', 'F1', 'right');
    text(`Emise le ${formatDate(data.issuedAt)}`, 548, 748, 9, '#C9D8E5', 'F1', 'right');
    rect(46, 709, 102, 24, '#15B8A6', 12);
    text('MISSION VALIDEE', 60, 717, 8, '#FFFFFF', 'F2');

    text(data.type === 'recruiter' ? 'EMETTEUR' : 'BENEFICIAIRE', 46, 650, 8, '#678198', 'F2');
    text(data.candidateName, 46, 628, 13, '#102A43', 'F2', 'left', 42);
    text(data.candidateReference, 46, 610, 9, '#526A7D', 'F1', 'left', 48);
    text(data.type === 'recruiter' ? 'DESTINATAIRE' : 'VERSE PAR', 322, 650, 8, '#678198', 'F2');
    text(data.establishmentName, 322, 628, 13, '#102A43', 'F2', 'left', 38);
    text(data.establishmentAddress || data.city, 322, 610, 9, '#526A7D', 'F1', 'left', 46);
    line(46, 583, 549, 583, '#D9E4EC');

    text('DETAIL DE LA PRESTATION', 46, 552, 9, '#102A43', 'F2');
    rect(46, 510, 503, 28, '#EAF8F6', 4);
    text('Mission', 60, 520, 8, '#426276', 'F2');
    text('Periode', 355, 520, 8, '#426276', 'F2');
    text('Montant', 532, 520, 8, '#426276', 'F2', 'right');
    text(data.missionTitle, 60, 481, 11, '#102A43', 'F2', 'left', 45);
    text(data.city, 60, 463, 9, '#678198', 'F1', 'left', 40);
    const period = data.endDate && formatDate(data.endDate) !== formatDate(data.startDate)
      ? `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`
      : formatDate(data.startDate);
    text(period, 355, 481, 9, '#243145', 'F1', 'left', 25);
    const hours = [data.startTime, data.endTime].filter(Boolean).join(' - ');
    if (hours) text(hours, 355, 463, 8, '#678198');
    text(`${formatAmount(data.amount)} ${data.currency}`, 532, 476, 11, '#102A43', 'F2', 'right');
    line(46, 441, 549, 441, '#D9E4EC');

    rect(46, 345, 292, 72, '#F4F7FA', 8);
    text('MODALITE', 62, 393, 8, '#678198', 'F2');
    text(data.compensationMode === CompensationMode.RETROCESSION ? "Retrocession d'honoraires" : 'Montant fixe', 62, 371, 11, '#102A43', 'F2');
    if (data.retrocessionPercentage) text(`Taux contractuel : ${data.retrocessionPercentage}%`, 62, 353, 9, '#526A7D');
    rect(359, 345, 190, 72, '#102A43', 8);
    text('TOTAL', 377, 391, 8, '#A9C3D6', 'F2');
    text(`${formatAmount(data.amount)} ${data.currency}`, 531, 361, 19, '#FFFFFF', 'F2', 'right');

    rect(46, 250, 503, 65, '#EAF8F6', 8);
    text('INFORMATION', 62, 290, 8, '#128578', 'F2');
    text(data.amount > 0
      ? 'Le montant ci-dessus correspond a la retrocession validee pour cette mission.'
      : 'Le taux contractuel est valide. Le montant reel reste a completer apres encaissement.', 62, 269, 9, '#315A63', 'F1', 'left', 88);

    line(46, 117, 549, 117, '#D9E4EC');
    text('Document genere automatiquement par MediLink', 46, 91, 8, '#678198');
    text('Reference mission et historique disponibles dans votre espace securise.', 46, 75, 8, '#8AA0B2');
    text('medilink.fr', 549, 91, 8, '#128578', 'F2', 'right');
    text('Page 1 / 1', 549, 75, 8, '#8AA0B2', 'F1', 'right');

    const stream = `${commands.join('\n')}\n`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >> endobj\n',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
      `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}endstream endobj\n`,
      '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n',
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
