import { Body, Controller, Delete, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AllowUnverified } from '../../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000, blockDuration: 15 * 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return {
      message: result.message,
      userId: result.userId,
      user: result.user,
    };
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 5 * 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return { user: result.user };
  }

  @Post('logout')
  @Public()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.cookieName();
    const token = req.cookies?.[cookieName];
    const result = await this.auth.logout(token);
    res.clearCookie(cookieName, this.cookieOptions());
    return result;
  }

  @Get('me')
  @AllowUnverified()
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @Delete('me')
  @AllowUnverified()
  async deleteAccount(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.deleteAccount(user.id);
    res.clearCookie(this.cookieName(), this.cookieOptions());
    return result;
  }

  @Post('verify-email')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000, blockDuration: 60 * 60_000 } })
  @AllowUnverified()
  resendVerification(@CurrentUser() user: RequestUser) {
    return this.auth.resendVerificationEmail(user.id);
  }

  @Post('forgot-password')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000, blockDuration: 15 * 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000, blockDuration: 15 * 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  private setSessionCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(this.cookieName(), token, {
      ...this.cookieOptions(),
      expires: expiresAt,
    });
  }

  private cookieOptions() {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      priority: 'high' as const,
      path: '/',
    };
  }

  private cookieName() {
    return (
      this.config.get<string>('SESSION_COOKIE_NAME') ||
      (this.config.get<string>('NODE_ENV') === 'production'
        ? '__Host-medilink_session'
        : 'medilink_session')
    );
  }
}
