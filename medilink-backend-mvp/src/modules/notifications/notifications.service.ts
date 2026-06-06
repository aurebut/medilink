import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

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

  async notifyApplicationReceived(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        mission: { include: { createdBy: true } },
        candidate: { include: { profile: true } },
      },
    });

    if (!application) return;

    const recipient = application.mission.createdBy;
    await this.create({
      userId: recipient.id,
      type: NotificationType.APPLICATION_RECEIVED,
      title: 'Nouvelle candidature',
      body: `Nouvelle candidature pour ${application.mission.title}.`,
      data: { applicationId, missionId: application.missionId },
    });

    await this.email.sendApplicationReceivedEmail(recipient.id, recipient.email);
  }

  async notifyApplicationStatusChanged(applicationId: string, status: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { candidate: true, mission: true },
    });

    if (!application) return;

    await this.create({
      userId: application.candidateUserId,
      type: NotificationType.APPLICATION_STATUS_CHANGED,
      title: 'Statut candidature mis à jour',
      body: `Votre candidature pour ${application.mission.title} est maintenant : ${status}.`,
      data: { applicationId, missionId: application.missionId, status },
    });

    await this.email.sendApplicationStatusEmail(
      application.candidate.id,
      application.candidate.email,
      status,
    );
  }

  async notifyNewMessage(conversationId: string, senderUserId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: senderUserId },
        muted: false,
      },
      include: { conversation: true },
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return;

    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
      include: { profile: true },
    });

    let senderName = 'l\'établissement';

    if (sender?.role === 'CANDIDATE') {
      senderName = `${sender.profile?.firstName || ''} ${sender.profile?.lastName || ''}`.trim() || sender.email;
    } else {
      const establishment = await this.prisma.establishment.findUnique({
        where: { id: conversation.establishmentId },
      });
      if (establishment) {
        senderName = establishment.name;
      }
    }

    for (const participant of participants) {
      const user = await this.prisma.user.findUnique({ where: { id: participant.userId } });
      if (!user) continue;

      await this.create({
        userId: user.id,
        type: NotificationType.NEW_MESSAGE,
        title: 'Nouveau message',
        body: senderName ? `Vous avez reçu un nouveau message de ${senderName}.` : 'Vous avez reçu un nouveau message.',
        data: { conversationId },
      });

      await this.email.sendNewMessageEmail(user.id, user.email);
    }
  }

  async notifyDocumentStatus(userId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const type =
      status === 'APPROVED'
        ? NotificationType.DOCUMENT_APPROVED
        : NotificationType.DOCUMENT_REJECTED;

    await this.create({
      userId,
      type,
      title: status === 'APPROVED' ? 'Document validé' : 'Document refusé',
      body:
        status === 'APPROVED'
          ? 'Votre document a été validé.'
          : `Votre document a été refusé.${reason ? ` Motif : ${reason}` : ''}`,
    });

    await this.email.sendDocumentStatusEmail(user.id, user.email, status, reason);
  }
}
