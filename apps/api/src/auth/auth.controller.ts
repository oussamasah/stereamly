import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { BrowserOriginGuard } from './browser-origin.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from './dto';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
const COOKIE = 'stream_refresh';
@UseGuards(BrowserOriginGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('resend-verification') resend(@Body() dto: ForgotPasswordDto) { return this.auth.resendVerification(dto.email); }
  @Post('verify-email') verify(@Body() dto: TokenDto) { return this.auth.verifyEmail(dto.token); }
  @Post('login') async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) { const session = await this.auth.login(dto); this.setCookie(response, session.refreshToken); return { ...session, refreshToken: undefined }; }
  @Post('refresh') async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) { const session = await this.auth.refresh(request.cookies?.[COOKIE] ?? ''); this.setCookie(response, session.refreshToken); return { ...session, refreshToken: undefined }; }
  @Post('logout') async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) { const result = await this.auth.logout(request.cookies?.[COOKIE]); response.clearCookie(COOKIE, this.cookieOptions()); return result; }
  @UseGuards(AuthGuard) @Post('logout-all') logoutAll(@Req() request: AuthenticatedRequest) { return this.auth.logoutAll(request.user.id); }
  @UseGuards(AuthGuard) @Get('me') profile(@Req() request: AuthenticatedRequest) { return this.auth.profile(request.user.id); }
  @Post('forgot-password') forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto.email); }
  @Post('reset-password') reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }
  private cookieOptions() { const production = process.env.NODE_ENV === 'production'; return { httpOnly: true, secure: production, sameSite: 'lax' as const, path: '/api/v1/auth' }; }
  private setCookie(response: Response, token: string) { response.cookie(COOKIE, token, { ...this.cookieOptions(), maxAge: this.config.get<number>('REFRESH_TOKEN_TTL_SECONDS', 2592000) * 1000 }); }
}
