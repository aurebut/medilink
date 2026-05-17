import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { addDays, addHours } from '../../utils/date.util';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { createRawToken, hashToken } from '../../common/utils/token.util';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterAccountType, RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role =
      dto.accountType === RegisterAccountType.CANDIDATE
        ? UserRole.CANDIDATE
        : UserRole.ESTABLISHMENT_OWNER;

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
          phone: dto.phone,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          profile:
            role === UserRole.CANDIDATE
              ? {
                  create: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                  },
                }
              : undefined,
        },
      });

      return createdUser;
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'user.registered',
      entityType: 'user',
      entityId: user.id,
      metadata: { role },
    });

    const session = await this.createSession(user.id);

    return {
      message: 'Compte cree.',
      userId: user.id,
      token: session.token,
      expiresAt: session.expiresAt,
      user: this.toSafeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Compte inactif.');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      await this.audit.log({
        actorUserId: user.id,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: user.id,
      });
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
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, status: UserStatus.ACTIVE },
      }),
    ]);

    await this.audit.log({
      actorUserId: record.userId,
      action: 'auth.email_verified',
      entityType: 'user',
      entityId: record.userId,
    });

    return { message: 'Email vérifié.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Réponse neutre pour ne pas révéler si l’email existe.
    if (!user) {
      return { message: 'Si le compte existe, un email de réinitialisation sera envoyé.' };
    }

    const rawToken = createRawToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: addHours(new Date(), 1),
      },
    });

    await this.emailService.sendPasswordResetEmail(user.id, user.email, rawToken);

    return { message: 'Si le compte existe, un email de réinitialisation sera envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashToken(dto.token);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      actorUserId: record.userId,
      action: 'auth.password_reset',
      entityType: 'user',
      entityId: record.userId,
    });

    return { message: 'Mot de passe réinitialisé.' };
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
      Number(this.config.get<string>('SESSION_MAX_AGE_DAYS') || 30),
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

