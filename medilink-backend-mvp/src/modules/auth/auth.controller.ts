import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
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
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return {
      message: result.message,
      userId: result.userId,
      user: result.user,
      token: result.token,
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return { user: result.user, token: result.token };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.cookieName();
    const token = req.cookies?.[cookieName] || this.bearerToken(req);
    const result = await this.auth.logout(token);
    res.clearCookie(cookieName, this.cookieOptions());
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  async deleteAccount(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.deleteAccount(user.id);
    res.clearCookie(this.cookieName(), this.cookieOptions());
    return result;
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @UseGuards(AuthGuard)
  resendVerification(@CurrentUser() user: RequestUser) {
    return this.auth.resendVerificationEmail(user.id);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
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
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }

  private cookieName() {
    return this.config.get<string>('SESSION_COOKIE_NAME') || 'medilink_session';
  }

  private bearerToken(req: Request) {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    return authHeader.slice('Bearer '.length).trim();
  }
}
