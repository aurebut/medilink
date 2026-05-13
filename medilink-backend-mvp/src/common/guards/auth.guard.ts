import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { hashToken } from '../utils/token.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName =
      this.config.get<string>('SESSION_COOKIE_NAME') || 'medilink_session';

    const rawToken = req.cookies?.[cookieName];

    if (!rawToken) {
      throw new UnauthorizedException('Authentification requise.');
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
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