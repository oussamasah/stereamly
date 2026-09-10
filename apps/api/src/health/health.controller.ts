import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}
  @Get('live') live() { return { status: 'ok', timestamp: new Date().toISOString() }; }
  @Get('ready') async ready() { const [database, redis] = await Promise.all([this.prisma.$queryRaw`SELECT 1`.then(() => 'ok'), this.redis.ping().then(() => 'ok')]); return { status: 'ok', database, redis, timestamp: new Date().toISOString() }; }
}

