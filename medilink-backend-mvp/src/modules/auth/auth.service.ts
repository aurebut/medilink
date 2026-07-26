import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { addDays, addHours } from '../../utils/date.util';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../documents/storage.service';
import { EmailService } from '../notifications/email.service';
import { AnsDirectoryService } from '../profiles/ans-directory.service';
import { ProfilesService } from '../profiles/profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { createRawToken, hashToken } from '../../common/utils/token.util';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterAccountType, RegisterDto } from './dto/register.dto';

const DUMMY_PASSWORD_HASH =
  '$2a$12$mofX6yLm7OrRbMr9JFpX5.p6.gxGK4ZaF0TZJ8NgDZ8/Tg53Ba8Jy';

@Injectable()
export class AuthService {
  private readonly sessionMaxAgeDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly audit: AuditService,
    private readonly profiles: ProfilesService,
    private readonly ansDirectory: AnsDirectoryService,
    private readonly storage: StorageService,
  ) {
    this.sessionMaxAgeDays = Number(
      this.config.get<string>('SESSION_MAX_AGE_DAYS') || 7,
    );
    if (
      !Number.isInteger(this.sessionMaxAgeDays) ||
      this.sessionMaxAgeDays < 1 ||
      this.sessionMaxAgeDays > 30
    ) {
      throw new Error('SESSION_MAX_AGE_DAYS must be between 1 and 30.');
    }
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const requestedRpps = dto.rpps
      ? this.ansDirectory.normalizeRpps(dto.rpps)
      : undefined;

    if (requestedRpps && (requestedRpps.length < 8 || requestedRpps.length > 14)) {
      throw new BadRequestException('Numéro RPPS invalide.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role =
      dto.accountType === RegisterAccountType.CANDIDATE
        ? UserRole.CANDIDATE
        : UserRole.ESTABLISHMENT_OWNER;

    const result = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
          phone: dto.phone,
          status: UserStatus.PENDING_EMAIL_VERIFICATION,
          emailVerified: false,
          profile:
            role === UserRole.CANDIDATE
              ? {
                  create: {
                    firstName: dto.firstName?.trim(),
                    lastName: dto.lastName?.trim(),
                    candidateGender: dto.candidateGender,
                    healthVerificationPayload: requestedRpps
                      ? ({ pendingRpps: requestedRpps } as Prisma.InputJsonValue)
                      : undefined,
                  },
                }
              : undefined,
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          phone: true,
          createdAt: true,
        },
      });

      const rawToken = createRawToken();
      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash: hashToken(rawToken),
          expiresAt: addDays(new Date(), 3),
        },
      });

      return { user: createdUser, rawToken };
    });

    const { user, rawToken } = result;

    await this.audit.log({
      actorUserId: user.id,
      action: 'user.registered',
      entityType: 'user',
      entityId: user.id,
      metadata: { role },
    });

    await this.emailService.sendVerificationEmail(user.id, user.email, rawToken);

    const session = await this.createSession(user.id);

    return {
      message: 'Compte créé. Veuillez vérifier votre email.',
      userId: user.id,
      token: session.token,
      expiresAt: session.expiresAt,
      user: this.toSafeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        emailVerified: true,
        phone: true,
        createdAt: true,
        deletedAt: true,
      },
    });
    const validPassword = await bcrypt.compare(
      dto.password,
      user?.passwordHash || DUMMY_PASSWORD_HASH,
    );

    if (
      !user ||
      user.deletedAt ||
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.DELETED ||
      !validPassword
    ) {
      if (user && !user.deletedAt) {
        await this.audit.log({
          actorUserId: user.id,
          action: 'auth.login_failed',
          entityType: 'user',
          entityId: user.id,
        });
      }
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const session = await this.createSession(user.id);

    await this.audit.log({
      actorUserId: user.id,
      action: 'auth.login_success',
      entityType: 'user',
      entityId: user.id,
    });

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      user: this.toSafeUser(user),
    };
  }

  async logout(rawToken?: string) {
    if (rawToken) {
      await this.prisma.session.updateMany({
        where: { tokenHash: hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Déconnecté.' };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);

    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.user.status === UserStatus.SUSPENDED ||
      record.user.status === UserStatus.DELETED ||
      record.user.deletedAt
    ) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }

    const now = new Date();
    const activatedUser = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException('Lien de vérification invalide ou expiré.');
      }

      const activated = await tx.user.updateMany({
        where: {
          id: record.userId,
          status: UserStatus.PENDING_EMAIL_VERIFICATION,
          emailVerified: false,
          deletedAt: null,
        },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      });

      if (activated.count !== 1) {
        throw new BadRequestException('Ce compte ne peut pas être activé.');
      }

      await tx.emailVerificationToken.updateMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
          usedAt: null,
        },
        data: { expiresAt: now },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: record.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
        },
      });
    });

    await this.audit.log({
      actorUserId: record.userId,
      action: 'auth.email_verified',
      entityType: 'user',
      entityId: record.userId,
    });

    if (activatedUser.role === UserRole.CANDIDATE) {
      const profile = await this.prisma.profile.findUnique({
        where: { userId: activatedUser.id },
        select: { healthVerificationPayload: true },
      });
      const payload = profile?.healthVerificationPayload;
      const pendingRpps =
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        typeof (payload as Record<string, unknown>).pendingRpps === 'string'
          ? String((payload as Record<string, unknown>).pendingRpps)
          : undefined;

      if (pendingRpps) {
        void this.profiles
          .verifyHealthProfessional(
            {
              id: activatedUser.id,
              email: activatedUser.email,
              role: activatedUser.role,
              status: activatedUser.status,
              emailVerified: activatedUser.emailVerified,
            },
            pendingRpps,
          )
          .catch(() => undefined);
      }
    }

    return { message: 'Email vérifié.' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerified: true,
        deletedAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }

    if (
      user.status !== UserStatus.PENDING_EMAIL_VERIFICATION ||
      user.deletedAt
    ) {
      throw new UnauthorizedException('Ce compte ne peut pas être activé.');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Votre adresse email est déjà vérifiée.');
    }

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: new Date() },
    });

    const rawToken = createRawToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: addDays(new Date(), 3),
      },
    });

    await this.emailService.sendVerificationEmail(user.id, user.email, rawToken);

    return { message: 'Un nouvel email de validation a été envoyé.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        status: true,
        deletedAt: true,
      },
    });

    // Réponse neutre pour ne pas révéler si l’email existe.
    if (!user) {
      return { message: 'Si le compte existe, un email de réinitialisation sera envoyé.' };
    }

    if (
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.DELETED ||
      user.deletedAt
    ) {
      return { message: 'Si le compte existe, un email de réinitialisation sera envoyé.' };
    }

    const rawToken = createRawToken();
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { expiresAt: now },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: addHours(now, 1),
        },
      });
    });

    await this.emailService.sendPasswordResetEmail(user.id, user.email, rawToken);

    return { message: 'Si le compte existe, un email de réinitialisation sera envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashToken(dto.token);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            email: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.user.status === UserStatus.SUSPENDED ||
      record.user.status === UserStatus.DELETED ||
      record.user.deletedAt
    ) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException('Lien de réinitialisation invalide ou expiré.');
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    await this.audit.log({
      actorUserId: record.userId,
      action: 'auth.password_reset',
      entityType: 'user',
      entityId: record.userId,
    });

    await this.emailService.sendPasswordChangedSuccessEmail(record.userId, record.user.email);

    return { message: 'Mot de passe réinitialisé.' };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }

    const anonymizedEmail = `deleted_${userId}_${Date.now()}@deleted.medilink.fr`;
    const documents = await this.prisma.document.findMany({
      where: { userId },
      select: { storageKey: true },
    });

    for (const document of documents) {
      await this.storage.deleteObject(document.storageKey);
    }

    await this.prisma.$transaction(async (tx) => {
      // Identity files are removed from object storage before their metadata.
      await tx.document.deleteMany({ where: { userId } });

      // Delete associated profile (which cascades to UserSkill).
      await tx.profile.deleteMany({ where: { userId } });

      // Remove access grants and private delivery data.
      await tx.establishmentMember.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.emailEvent.updateMany({
        where: { userId },
        data: {
          userId: null,
          recipient: anonymizedEmail,
          providerMessageId: null,
          errorMessage: null,
        },
      });

      // Pseudonymize the account while retaining legally relevant business links.
      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.DELETED,
          deletedAt: new Date(),
          email: anonymizedEmail,
          phone: null,
          phoneVerified: false,
          passwordHash: '',
          emailVerified: false,
        },
      });
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'user.deleted',
      entityType: 'user',
      entityId: userId,
    });

    return { message: 'Compte supprimé avec succès.' };
  }

  private toSafeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }

  private async createSession(userId: string) {
    const rawToken = createRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addDays(
      new Date(),
      this.sessionMaxAgeDays,
    );

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { token: rawToken, expiresAt };
  }
}

