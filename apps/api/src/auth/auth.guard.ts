import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
export type AuthenticatedRequest = Request & { user: { id: string; role: string } };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('AUTHENTICATION_REQUIRED');
    try { const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(token); request.user = { id: payload.sub, role: payload.role }; return true; }
    catch { throw new UnauthorizedException('INVALID_ACCESS_TOKEN'); }
  }
}
