import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailEventStatus, UserRole } from '@prisma/client';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';

export type MissionEmailContext = {
  missionTitle?: string | null;
  establishmentName?: string | null;
  candidateName?: string | null;
  senderName?: string | null;
  city?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  startTime?: string | null;
  endTime?: string | null;
  conversationId?: string | null;
  recipientRole?: UserRole | string | null;
  messagePreview?: string | null;
  workflowAction?: string | null;
};

export type DocumentEmailContext = {
  documentType?: string | null;
  fileName?: string | null;
};

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

  private getFrontendUrl(): string {
    const raw = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return raw.split(',')[0].trim();
  }

  private escapeHtml(value?: string | number | null): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private subjectText(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private formatDate(value?: Date | string | null): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  private formatMissionDate(context: MissionEmailContext): string | null {
    const startDate = this.formatDate(context.startDate);
    const endDate = this.formatDate(context.endDate);
    const timeRange = [context.startTime, context.endTime].filter(Boolean).join(' - ');
    const dateRange = startDate && endDate && startDate !== endDate
      ? `${startDate} - ${endDate}`
      : startDate;
    return [dateRange, timeRange].filter(Boolean).join(' | ') || null;
  }

  private messageLink(context: MissionEmailContext): string {
    const basePath = context.recipientRole === UserRole.CANDIDATE ? '/app/messages' : '/establishment/messages';
    const query = context.conversationId ? `?id=${encodeURIComponent(context.conversationId)}` : '';
    return `${this.getFrontendUrl()}${basePath}${query}`;
  }

  private missionDetails(context: MissionEmailContext): string {
    const rows = [
      ['Mission', context.missionTitle],
      ['Etablissement', context.establishmentName],
      ['Candidat', context.candidateName],
      ['Ville', context.city],
      ['Date', this.formatMissionDate(context)],
    ].filter(([, value]) => value);

    if (!rows.length) return '';

    return `
      <div style="background-color: #F8F7F3; border: 1px solid #E4E9F2; border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: #0F1E32;">
        ${rows.map(([label, value]) => `
          <p style="margin: 0 0 8px 0;"><strong>${this.escapeHtml(label)} :</strong> ${this.escapeHtml(value)}</p>
        `).join('')}
      </div>
    `;
  }

  private cta(label: string, href: string): string {
    return `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.escapeHtml(href)}" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 138, 122, 0.15); transition: background-color 0.2s;">
              ${this.escapeHtml(label)}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  private applicationStatusLabel(status: string): string {
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

  private documentTypeLabel(type?: string | null): string | null {
    if (!type) return null;
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
    return labels[type] || type;
  }

  private wrapInLayout(title: string, bodyHtml: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #F8F7F3; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F1E32;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F7F3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E4E9F2; overflow: hidden; box-shadow: 0 8px 32px rgba(11, 25, 41, 0.03);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 48px 32px 48px; text-align: center;">
              <span style="font-family: 'DM Sans', sans-serif; font-size: 26px; font-weight: 500; color: #0B1929; letter-spacing: -0.5px;">
                Médi<span style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; color: #0E8A7A; font-size: 29px; margin-left: 1px;">Link</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 48px 40px 48px; font-family: 'DM Sans', sans-serif;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;">
              <hr style="border: 0; border-top: 1px solid #E4E9F2; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 48px 40px 48px; text-align: center; font-size: 13px; color: #6A7A92; line-height: 1.6; font-family: 'DM Sans', sans-serif;">
              <p style="margin: 0 0 8px 0;">Vous recevez cet e-mail dans le cadre de votre activité sur Médilink.</p>
              <p style="margin: 0 0 16px 0;">© ${new Date().getFullYear()} Médilink. Tous droits réservés.</p>
              <p style="margin: 0;">
                <a href="${this.getFrontendUrl()}" style="color: #0E8A7A; text-decoration: none; font-weight: 600;">Accéder à la plateforme</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  sendVerificationEmail(userId: string, to: string, token: string) {
    const frontendUrl = this.getFrontendUrl();
    const link = `${frontendUrl}/verify-email?token=${token}`;

    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Confirmez votre adresse email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Bienvenue sur <strong>Médilink</strong> ! Nous sommes ravis de vous compter parmi nous. 
        Pour finaliser votre inscription et activer pleinement votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${link}" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 138, 122, 0.15); transition: background-color 0.2s;">
              Confirmer mon email
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size: 13px; line-height: 1.6; color: #6A7A92; margin-top: 0; margin-bottom: 0; background-color: #F8F7F3; border-radius: 8px; padding: 16px; border: 1px solid #E4E9F2; word-break: break-all;">
        Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :<br>
        <a href="${link}" style="color: #0E8A7A; text-decoration: none;">${link}</a>
      </p>
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'auth.verify_email',
      subject: 'Confirmez votre email Médilink',
      html: this.wrapInLayout('Confirmez votre email Médilink', bodyHtml),
    });
  }

  sendPasswordResetEmail(userId: string, to: string, token: string) {
    const frontendUrl = this.getFrontendUrl();
    const link = `${frontendUrl}/reset-password?token=${token}`;

    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Réinitialisation de votre mot de passe</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Vous avez demandé la réinitialisation du mot de passe de votre compte Médilink. 
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 1 heure.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${link}" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 138, 122, 0.15); transition: background-color 0.2s;">
              Créer un nouveau mot de passe
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size: 13px; line-height: 1.6; color: #6A7A92; margin-top: 0; margin-bottom: 0; background-color: #F8F7F3; border-radius: 8px; padding: 16px; border: 1px solid #E4E9F2;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel restera inchangé.
      </p>
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'auth.reset_password',
      subject: 'Réinitialisation de votre mot de passe Médilink',
      html: this.wrapInLayout('Réinitialisation de votre mot de passe', bodyHtml),
    });
  }

  sendPasswordChangedSuccessEmail(userId: string, to: string) {
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Votre mot de passe a été modifié</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Nous vous informons que le mot de passe de votre compte Médilink a été modifié avec succès.
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #B42318; margin-top: 0; margin-bottom: 0; background-color: #FEF2F2; border-radius: 8px; padding: 16px; border: 1px solid rgba(180, 35, 24, 0.15); font-family: 'DM Sans', sans-serif;">
        <strong>Important :</strong> Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement notre équipe d'assistance pour sécuriser votre compte.
      </p>
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'auth.password_changed',
      subject: 'Modification de votre mot de passe Médilink',
      html: this.wrapInLayout('Modification de votre mot de passe', bodyHtml),
    });
  }

  sendNewMessageEmail(userId: string, to: string, context: MissionEmailContext = {}) {
    const senderName = context.senderName || context.establishmentName || 'un interlocuteur';
    const action = context.workflowAction || `Nouveau message de ${senderName}`;
    const preview = context.messagePreview
      ? `
        <div style="background-color: #FFFFFF; border-left: 3px solid #0E8A7A; padding: 12px 14px; margin: 0 0 24px 0; color: #0F1E32; font-size: 14px; line-height: 1.6;">
          ${this.escapeHtml(context.messagePreview)}
        </div>
      `
      : '';

    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">${this.escapeHtml(action)}</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        ${context.workflowAction
          ? `Une action vient d'etre effectuee dans votre conversation avec ${this.escapeHtml(senderName)}.`
          : `Vous avez recu un nouveau message de <strong>${this.escapeHtml(senderName)}</strong>.`}
      </p>
      ${this.missionDetails(context)}
      ${preview}
      ${this.cta('Acceder a la conversation', this.messageLink(context))}
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'message.new',
      subject: this.subjectText(context.workflowAction
        ? `${context.workflowAction} - Medilink`
        : `Nouveau message de ${senderName} - Medilink`),
      html: this.wrapInLayout('Nouveau message sur Medilink', bodyHtml),
    });
  }

  sendApplicationReceivedEmail(userId: string, to: string, context: MissionEmailContext = {}) {
    const candidateName = context.candidateName || 'Un candidat';
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Nouvelle candidature recue</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        <strong>${this.escapeHtml(candidateName)}</strong> vient de postuler a votre mission${context.missionTitle ? ` <strong>${this.escapeHtml(context.missionTitle)}</strong>` : ''}.
        Vous pouvez consulter son profil, son message et poursuivre l'echange depuis votre espace etablissement.
      </p>
      ${this.missionDetails(context)}
      ${this.cta('Consulter la candidature', `${this.getFrontendUrl()}/establishment/dashboard`)}
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'application.received',
      subject: this.subjectText(`${candidateName} a postule${context.missionTitle ? ` - ${context.missionTitle}` : ''}`),
      html: this.wrapInLayout('Nouvelle candidature recue', bodyHtml),
    });
  }

  sendApplicationStatusEmail(userId: string, to: string, status: string, context: MissionEmailContext = {}) {
    const statusLabel = this.applicationStatusLabel(status);
    const isAccepted = status === 'ACCEPTED';
    const isRejected = status === 'REJECTED';
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Votre candidature est ${this.escapeHtml(statusLabel)}</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        ${isAccepted
          ? `Votre candidature est acceptee pour cette mission. Vous pouvez maintenant finaliser les prochaines etapes dans la conversation.`
          : isRejected
            ? `L'etablissement ${context.establishmentName ? `<strong>${this.escapeHtml(context.establishmentName)}</strong>` : ''} n'a pas retenu votre candidature pour cette mission.`
            : `Le statut de votre candidature a ete mis a jour : <strong style="color: #0E8A7A;">${this.escapeHtml(statusLabel)}</strong>.`}
      </p>
      ${this.missionDetails(context)}
      ${this.cta(context.conversationId ? 'Ouvrir la conversation' : 'Suivre mes candidatures', context.conversationId ? this.messageLink({ ...context, recipientRole: UserRole.CANDIDATE }) : `${this.getFrontendUrl()}/app/dashboard`)}
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'application.status_changed',
      subject: this.subjectText(`Candidature ${statusLabel}${context.missionTitle ? ` - ${context.missionTitle}` : ''}`),
      html: this.wrapInLayout('Statut de votre candidature mis a jour', bodyHtml),
    });
  }

  sendDocumentStatusEmail(
    userId: string,
    to: string,
    status: string,
    reason?: string,
    context: DocumentEmailContext = {},
  ) {
    const documentType = this.documentTypeLabel(context.documentType) || 'document';
    const approved = status === 'APPROVED';
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">${approved ? 'Document valide' : 'Document refuse'}</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Notre equipe a ${approved ? 'valide' : 'refuse'} votre ${this.escapeHtml(documentType)}${context.fileName ? ` <strong>${this.escapeHtml(context.fileName)}</strong>` : ''}.
        ${approved ? 'Votre dossier gagne en fiabilite pour vos prochaines missions.' : 'Vous pouvez le corriger puis le renvoyer depuis votre profil.'}
      </p>
      ${reason ? `
        <div style="background-color: #FEF2F2; border: 1px solid rgba(180, 35, 24, 0.15); border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #991B1B; font-size: 14px; font-family: 'DM Sans', sans-serif;">
          <strong>Motif du refus :</strong><br>${this.escapeHtml(reason)}
        </div>
      ` : ''}
      ${this.cta('Acceder a mes documents', `${this.getFrontendUrl()}/app/profile`)}
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'document.status_changed',
      subject: `${approved ? 'Document valide' : 'Document refuse'} - Medilink`,
      html: this.wrapInLayout('Statut de votre document mis a jour', bodyHtml),
    });
  }
}
