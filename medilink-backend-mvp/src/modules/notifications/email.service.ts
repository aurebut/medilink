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

  private getFrontendUrl(): string {
    const raw = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return raw.split(',')[0].trim();
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

  sendNewMessageEmail(userId: string, to: string) {
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Nouveau message reçu</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Vous avez reçu un nouveau message sur la plateforme Médilink. Cliquez sur le bouton ci-dessous pour y répondre.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/app/messages" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 138, 122, 0.15); transition: background-color 0.2s;">
              Accéder à la messagerie
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'message.new',
      subject: 'Nouveau message sur Médilink',
      html: this.wrapInLayout('Nouveau message sur Médilink', bodyHtml),
    });
  }

  sendApplicationReceivedEmail(userId: string, to: string) {
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Nouvelle candidature reçue</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Bonne nouvelle ! Un candidat vient de postuler à l'une de vos annonces de mission sur Médilink. 
        Vous pouvez consulter sa candidature et son profil en cliquant ci-dessous.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/establishment/dashboard" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 138, 122, 0.15); transition: background-color 0.2s;">
              Consulter les candidatures
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'application.received',
      subject: 'Nouvelle candidature reçue',
      html: this.wrapInLayout('Nouvelle candidature reçue', bodyHtml),
    });
  }

  sendApplicationStatusEmail(userId: string, to: string, status: string) {
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Statut de votre candidature</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Le statut de votre candidature sur Médilink a été mis à jour par l'établissement.
        Il est désormais : <strong style="color: #0E8A7A;">${status}</strong>.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/app/dashboard" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 138, 122, 0.15); transition: background-color 0.2s;">
              Suivre mes candidatures
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'application.status_changed',
      subject: 'Statut de votre candidature mis à jour',
      html: this.wrapInLayout('Statut de votre candidature mis à jour', bodyHtml),
    });
  }

  sendDocumentStatusEmail(userId: string, to: string, status: string, reason?: string) {
    const bodyHtml = `
      <h1 style="font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">Statut de votre document</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Le statut de validation de l'un de vos justificatifs d'identité ou diplômes a été mis à jour par notre équipe.
        Il est maintenant : <strong style="color: ${status === 'APPROVED' ? '#0E8A7A' : '#B42318'};">${status === 'APPROVED' ? 'Approuvé' : 'Refusé'}</strong>.
      </p>
      ${reason ? `
        <div style="background-color: #FEF2F2; border: 1px solid rgba(180, 35, 24, 0.15); border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #991B1B; font-size: 14px; font-family: 'DM Sans', sans-serif;">
          <strong>Motif du refus :</strong><br>${reason}
        </div>
      ` : ''}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/app/profile" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 138, 122, 0.15); transition: background-color 0.2s;">
              Accéder à mes documents
            </a>
          </td>
        </tr>
      </table>
    `;

    return this.sendEmail({
      userId,
      to,
      type: 'document.status_changed',
      subject: 'Statut de votre document mis à jour',
      html: this.wrapInLayout('Statut de votre document mis à jour', bodyHtml),
    });
  }
}

