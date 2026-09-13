import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
@Injectable()
export class BrowserOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'GET' && request.cookies?.stream_refresh && request.headers.origin !== this.config.getOrThrow('WEB_ORIGIN')) throw new ForbiddenException('UNTRUSTED_BROWSER_ORIGIN');
    return true;
  }
}
