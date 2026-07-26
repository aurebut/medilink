import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ALLOW_UNVERIFIED_KEY } from '../decorators/allow-unverified.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hashToken } from '../utils/token.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const cookieName =
      this.config.get<string>('SESSION_COOKIE_NAME') ||
      (this.config.get<string>('NODE_ENV') === 'production'
        ? '__Host-medilink_session'
        : 'medilink_session');

    const rawToken = req.cookies?.[cookieName];

    if (!rawToken) {
      throw new UnauthorizedException('Authentification requise.');
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }

    if (
      session.user.status === UserStatus.SUSPENDED ||
      session.user.status === UserStatus.DELETED
    ) {
      throw new UnauthorizedException('Compte inactif.');
    }

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      !allowUnverified &&
      (session.user.status !== UserStatus.ACTIVE || !session.user.emailVerified)
    ) {
      throw new UnauthorizedException('Vérification de l’adresse email requise.');
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      emailVerified: session.user.emailVerified,
    };

    req.sessionId = session.id;

    return true;
  }
}
