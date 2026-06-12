import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

const WORKFLOW_PREFIX = '__MEDILINK_WORKFLOW__';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });
  }

  async list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification introuvable.');
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const readAt = new Date();
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });

    return { readAt };
  }

  async delete(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification introuvable.');
    }

    await this.prisma.notification.delete({
      where: { id: notification.id },
    });

    return { deleted: true };
  }

  async deleteAll(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { deleted: true };
  }

  async notifyApplicationReceived(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        mission: { include: { createdBy: true, establishment: true } },
        candidate: { include: { profile: true } },
      },
    });

    if (!application) return;

    const recipient = application.mission.createdBy;
    const candidateName = this.userDisplayName(application.candidate);

    await this.create({
      userId: recipient.id,
      type: NotificationType.APPLICATION_RECEIVED,
      title: 'Nouvelle candidature',
      body: `${candidateName} a postule pour ${application.mission.title}.`,
      data: { applicationId, missionId: application.missionId },
    });

    this.email.sendApplicationReceivedEmail(recipient.id, recipient.email, {
      candidateName,
      missionTitle: application.mission.title,
      establishmentName: application.mission.establishment.name,
      city: application.mission.city,
      startDate: application.mission.startDate,
      endDate: application.mission.endDate,
      startTime: application.mission.startTime,
      endTime: application.mission.endTime,
    }).catch((error) => {
      console.error('Failed to send application received email:', error);
    });
  }

  async notifyApplicationStatusChanged(applicationId: string, status: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        mission: { include: { establishment: true } },
        conversation: true,
      },
    });

    if (!application) return;

    const statusLabel = this.applicationStatusLabel(status);

    await this.create({
      userId: application.candidateUserId,
      type: NotificationType.APPLICATION_STATUS_CHANGED,
      title: 'Statut candidature mis a jour',
      body: `Votre candidature pour ${application.mission.title} est maintenant ${statusLabel}.`,
      data: { applicationId, missionId: application.missionId, status },
    });

    this.email.sendApplicationStatusEmail(
      application.candidate.id,
      application.candidate.email,
      status,
      {
        missionTitle: application.mission.title,
        establishmentName: application.mission.establishment.name,
        city: application.mission.city,
        startDate: application.mission.startDate,
        endDate: application.mission.endDate,
        startTime: application.mission.startTime,
        endTime: application.mission.endTime,
        conversationId: application.conversation?.id,
      },
    ).catch((error) => {
      console.error('Failed to send application status email:', error);
    });
  }

  async notifyNewMessage(conversationId: string, senderUserId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: senderUserId },
        muted: false,
      },
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        mission: true,
        establishment: true,
        application: { include: { candidate: { include: { profile: true } } } },
      },
    });
    if (!conversation) return;

    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
      include: { profile: true },
    });

    const latestMessage = await this.prisma.message.findFirst({
      where: {
        conversationId,
        senderUserId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const senderName = sender?.role === 'CANDIDATE'
      ? this.userDisplayName(sender)
      : conversation.establishment.name;
    const workflowAction = this.workflowActionLabel(latestMessage?.body);
    const messagePreview = workflowAction ? undefined : this.messagePreview(latestMessage?.body);
    const notificationBody = workflowAction
      ? `${senderName} : ${workflowAction}.`
      : `Vous avez recu un nouveau message de ${senderName}.`;
    const candidateName = this.userDisplayName(conversation.application.candidate);

    const recipientUsers = await this.prisma.user.findMany({
      where: { id: { in: participants.map((participant) => participant.userId) } },
    });
    const recipientsById = new Map(recipientUsers.map((user) => [user.id, user]));

    for (const participant of participants) {
      const user = recipientsById.get(participant.userId);
      if (!user) continue;

      await this.create({
        userId: user.id,
        type: NotificationType.NEW_MESSAGE,
        title: workflowAction || 'Nouveau message',
        body: notificationBody,
        data: { conversationId, missionId: conversation.missionId },
      });

      this.email.sendNewMessageEmail(user.id, user.email, {
        senderName,
        missionTitle: conversation.mission.title,
        establishmentName: conversation.establishment.name,
        candidateName,
        city: conversation.mission.city,
        startDate: conversation.mission.startDate,
        endDate: conversation.mission.endDate,
        startTime: conversation.mission.startTime,
        endTime: conversation.mission.endTime,
        conversationId,
        recipientRole: user.role,
        messagePreview,
        workflowAction,
      }).catch((error) => {
        console.error('Failed to send new message email:', error);
      });
    }
  }

  async notifyDocumentStatus(
    userId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
    documentId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const document = documentId
      ? await this.prisma.document.findUnique({ where: { id: documentId } })
      : null;
    const documentLabel = this.documentTypeLabel(document?.documentType);
    const type =
      status === 'APPROVED'
        ? NotificationType.DOCUMENT_APPROVED
        : NotificationType.DOCUMENT_REJECTED;

    await this.create({
      userId,
      type,
      title: status === 'APPROVED' ? 'Document valide' : 'Document refuse',
      body:
        status === 'APPROVED'
          ? `Votre ${documentLabel} a ete valide.`
          : `Votre ${documentLabel} a ete refuse.${reason ? ` Motif : ${reason}` : ''}`,
    });

    this.email.sendDocumentStatusEmail(user.id, user.email, status, reason, {
      documentType: document?.documentType,
      fileName: document?.fileName,
    }).catch((error) => {
      console.error('Failed to send document status email:', error);
    });
  }

  private userDisplayName(user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null }) {
    return [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email;
  }

  private messagePreview(body?: string | null) {
    if (!body) return undefined;
    const normalized = body.replace(/\s+/g, ' ').trim();
    if (!normalized) return undefined;
    return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
  }

  private workflowActionLabel(body?: string | null) {
    if (!body?.startsWith(WORKFLOW_PREFIX)) return undefined;

    try {
      const payload = JSON.parse(body.slice(WORKFLOW_PREFIX.length));
      const labels: Record<string, string> = {
        FINAL_PROPOSAL: 'Proposition finale envoyee',
        PAYMENT_REQUIRED: 'Proposition acceptee, paiement requis',
        PROPOSAL_REJECTED: 'Proposition refusee',
        FUNDS_SECURED: 'Paiement securise',
        MISSION_COMPLETED: 'Mission terminee',
        PAYMENT_RELEASED: 'Paiement libere',
        INVOICES_GENERATED: 'Factures generees',
      };
      return labels[payload.kind] || 'Mise a jour de la mission';
    } catch {
      return 'Mise a jour de la mission';
    }
  }

  private applicationStatusLabel(status: string) {
    const labels: Record<string, string> = {
      SUBMITTED: 'envoyee',
      VIEWED: 'consultee',
      ACCEPTED: 'acceptee',
      REJECTED: 'refusee',
      WITHDRAWN: 'retiree',
      CANCELLED: 'annulee',
    };
    return labels[status] || status;
  }

  private documentTypeLabel(type?: string | null) {
    const labels: Record<string, string> = {
      CV: 'CV',
      ATTESTATION: 'attestation',
      CONVENTION: 'convention',
      DIPLOMA: 'diplome',
      IDENTITY_DOCUMENT: "piece d'identite",
      INSURANCE: 'assurance',
      AVATAR: 'photo de profil',
      MESSAGE_ATTACHMENT: 'piece jointe',
      OTHER: 'document',
    };
    return type ? labels[type] || 'document' : 'document';
  }
}
