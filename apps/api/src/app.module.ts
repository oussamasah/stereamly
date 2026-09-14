import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { randomUUID } from 'node:crypto';
import { CatalogModule } from './catalog/catalog.module';
import { SourcesModule } from './sources/sources.module';
import { ImportsModule } from './imports/imports.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { PlatformModule } from './platform/platform.module';
import { ProvidersModule } from './providers/providers.module';
import { EpgModule } from './epg/epg.module';
import { PlaybackModule } from './playback/playback.module';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], validate: validateEnv }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), LoggerModule.forRoot({ pinoHttp: { redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie', '*.password', '*.token', '*.secret', '*.username', '*.macAddress', '*.deviceId', '*.signature'], genReqId: (req) => String(req.headers['x-request-id'] ?? randomUUID()) } }), PrismaModule, RedisModule, AuthModule, CatalogModule, SourcesModule, ImportsModule, DiscoveryModule, PlatformModule, ProvidersModule, EpgModule, PlaybackModule], controllers: [HealthController], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }] })
export class AppModule {}
