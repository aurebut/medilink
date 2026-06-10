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
</head>
<body style="margin: 0; padding: 0; background-color: #F8F7F3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F1E32;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F7F3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 30, 50, 0.03);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0B1929; padding: 35px 40px; text-align: center;">
              <span style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: 'Outfit', sans-serif;">
                Medi<span style="color: #0E8A7A;">Link</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; text-align: center; font-size: 12px; color: #6A7A92; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">Vous recevez cet e-mail dans le cadre de votre activité sur Médilink.</p>
              <p style="margin: 0 0 16px 0;">© ${new Date().getFullYear()} Médilink. Tous droits réservés.</p>
              <p style="margin: 0;">
                <a href="${this.getFrontendUrl()}" style="color: #0E8A7A; text-decoration: none; font-weight: 600;">Visiter la plateforme</a>
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
      <h1 style="font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Confirmez votre adresse email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Bienvenue sur <strong>Médilink</strong> ! Nous sommes ravis de vous compter parmi nous. 
        Pour finaliser votre inscription et activer pleinement votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${link}" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(14, 138, 122, 0.25); transition: background-color 0.2s;">
              Confirmer mon email
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size: 13px; line-height: 1.5; color: #6A7A92; margin-top: 0; margin-bottom: 0;">
        Si le bouton ne fonctionne pas, vous pouvez également copier et coller ce lien dans votre navigateur :<br>
        <a href="${link}" style="color: #0E8A7A; text-decoration: none; word-break: break-all;">${link}</a>
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
      <h1 style="font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Réinitialisation de votre mot de passe</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Vous avez demandé la réinitialisation du mot de passe de votre compte Médilink. 
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 1 heure.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${link}" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(14, 138, 122, 0.25); transition: background-color 0.2s;">
              Créer un nouveau mot de passe
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size: 13px; line-height: 1.5; color: #6A7A92; margin-top: 0; margin-bottom: 0;">
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

  sendNewMessageEmail(userId: string, to: string) {
    const bodyHtml = `
      <h1 style="font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Nouveau message reçu</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Vous avez reçu un nouveau message sur la plateforme Médilink. Cliquez sur le bouton ci-dessous pour y répondre.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/app/messages" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(14, 138, 122, 0.25); transition: background-color 0.2s;">
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
      <h1 style="font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Nouvelle candidature reçue</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Bonne nouvelle ! Un candidat vient de postuler à l'une de vos annonces de mission sur Médilink. 
        Vous pouvez consulter sa candidature et son profil en cliquant ci-dessous.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/establishment/dashboard" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(14, 138, 122, 0.25); transition: background-color 0.2s;">
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
      <h1 style="font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Statut de votre candidature</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Le statut de votre candidature sur Médilink a été mis à jour par l'établissement.
        Il est désormais : <strong style="color: #0E8A7A;">${status}</strong>.
      </p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/app/dashboard" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(14, 138, 122, 0.25); transition: background-color 0.2s;">
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
      <h1 style="font-size: 22px; font-weight: 700; color: #0B1929; margin-top: 0; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Statut de votre document</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #0F1E32; margin-top: 0; margin-bottom: 24px;">
        Le statut de validation de l'un de vos justificatifs d'identité ou diplômes a été mis à jour par notre équipe.
        Il est maintenant : <strong style="color: ${status === 'APPROVED' ? '#0E8A7A' : '#B42318'};">${status === 'APPROVED' ? 'Approuvé' : 'Refusé'}</strong>.
      </p>
      ${reason ? `
        <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #991B1B; font-size: 14px;">
          <strong>Motif du refus :</strong><br>${reason}
        </div>
      ` : ''}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${this.getFrontendUrl()}/app/profile" style="display: inline-block; background-color: #0E8A7A; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 10px rgba(14, 138, 122, 0.25); transition: background-color 0.2s;">
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
