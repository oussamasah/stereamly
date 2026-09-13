import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
export type AuthenticatedRequest = Request & { user: { id: string; role: string } };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('AUTHENTICATION_REQUIRED');
    let payload: { sub: string; version?: number };
    try { payload = await this.jwt.verifyAsync(token); }
    catch { throw new UnauthorizedException('INVALID_ACCESS_TOKEN'); }
    if (typeof payload.sub !== 'string') throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true, authVersion: true } });
    if (!user || user.status !== 'ACTIVE' || user.authVersion !== (payload.version ?? 0)) throw new UnauthorizedException('SESSION_REVOKED');
    request.user = { id: user.id, role: user.role };
    return true;
  }
}
