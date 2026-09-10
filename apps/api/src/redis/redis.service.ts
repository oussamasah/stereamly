import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), { lazyConnect: true, maxRetriesPerRequest: 2, enableOfflineQueue: false });
    this.client.on('error', () => undefined);
  }
  async ping() { if (this.client.status === 'wait') await this.client.connect(); return this.client.ping(); }
  async ensureConnected() {
    if (this.client.status === 'wait') await this.client.connect();
    if (this.client.status === 'connecting') await new Promise<void>((resolve, reject) => { this.client.once('ready', resolve); this.client.once('error', reject); });
  }
  async onModuleDestroy() { if (!['wait', 'end'].includes(this.client.status)) await this.client.quit(); }
}
