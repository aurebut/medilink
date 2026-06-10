import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailEventStatus } from '@prisma/client';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend?: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendEmail(params: {
    userId?: string;
    to: string;
    subject: string;
    html: string;
    type: string;
  }) {
    const event = await this.prisma.emailEvent.create({
      data: {
        userId: params.userId,
        recipient: params.to,
        subject: params.subject,
        type: params.type,
        status: EmailEventStatus.PENDING,
      },
    });

    try {
      let providerMessageId: string | undefined;

      if (this.resend) {
        const result = await this.resend.emails.send({
          from: this.config.get<string>('EMAIL_FROM') || 'Médilink <no-reply@example.com>',
          to: params.to,
          subject: params.subject,
          html: params.html,
        });
        providerMessageId = result.data?.id;
      } else {
        this.logger.log(`[EMAIL MOCK] To: ${params.to} | Subject: ${params.subject}`);
        const linkMatch = params.html.match(/href="([^"]+)"/);
        if (linkMatch && linkMatch[1]) {
          this.logger.log(`[EMAIL MOCK] Link: ${linkMatch[1]}`);
        } else {
          this.logger.log(`[EMAIL MOCK] Content: ${params.html}`);
        }
      }

      await this.prisma.emailEvent.update({
        where: { id: event.id },
        data: {
          status: EmailEventStatus.SENT,
          providerMessageId,
          sentAt: new Date(),
        },
      });
    } catch (error: any) {
      await this.prisma.emailEvent.update({
        where: { id: event.id },
        data: {
          status: EmailEventStatus.FAILED,
          errorMessage: error?.message || 'Erreur email inconnue',
          failedAt: new Date(),
        },
      });
      throw error;
    }
  }

  sendVerificationEmail(userId: string, to: string, token: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const link = `${frontendUrl}/verify-email?token=${token}`;

    return this.sendEmail({
      userId,
      to,
      type: 'auth.verify_email',
      subject: 'Confirmez votre email Médilink',
      html: `<p>Bienvenue sur Médilink.</p><p><a href="${link}">Confirmer mon email</a></p>`,
    });
  }

  sendPasswordResetEmail(userId: string, to: string, token: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const link = `${frontendUrl}/reset-password?token=${token}`;

    return this.sendEmail({
      userId,
      to,
      type: 'auth.reset_password',
      subject: 'Réinitialisation de votre mot de passe Médilink',
      html: `<p>Vous avez demandé une réinitialisation.</p><p><a href="${link}">Créer un nouveau mot de passe</a></p>`,
    });
  }

  sendNewMessageEmail(userId: string, to: string) {
    return this.sendEmail({
      userId,
      to,
      type: 'message.new',
      subject: 'Nouveau message sur Médilink',
      html: `<p>Vous avez reçu un nouveau message sur Médilink.</p>`,
    });
  }

  sendApplicationReceivedEmail(userId: string, to: string) {
    return this.sendEmail({
      userId,
      to,
      type: 'application.received',
      subject: 'Nouvelle candidature reçue',
      html: `<p>Vous avez reçu une nouvelle candidature sur Médilink.</p>`,
    });
  }

  sendApplicationStatusEmail(userId: string, to: string, status: string) {
    return this.sendEmail({
      userId,
      to,
      type: 'application.status_changed',
      subject: 'Statut de votre candidature mis à jour',
      html: `<p>Le statut de votre candidature est maintenant : <strong>${status}</strong>.</p>`,
    });
  }

  sendDocumentStatusEmail(userId: string, to: string, status: string, reason?: string) {
    return this.sendEmail({
      userId,
      to,
      type: 'document.status_changed',
      subject: 'Statut de votre document mis à jour',
      html: `<p>Votre document est maintenant : <strong>${status}</strong>.</p>${reason ? `<p>Motif : ${reason}</p>` : ''}`,
    });
  }
}
