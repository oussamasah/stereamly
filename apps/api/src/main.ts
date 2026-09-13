import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
// CommonJS is required because cookie-parser has no compatible default export.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true }); const config = app.get(ConfigService);
  app.set('trust proxy', config.get<number>('TRUST_PROXY_HOPS', 0));
  app.useLogger(app.get(Logger)); app.use(helmet()); app.use(cookieParser()); app.useStaticAssets(join(process.cwd(),'uploads'),{prefix:'/media/'}); app.enableCors({ origin: config.getOrThrow('WEB_ORIGIN'), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });
  app.setGlobalPrefix('api/v1'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); app.enableShutdownHooks();
  await app.listen(config.get<number>('API_PORT', 4000));
}
void bootstrap();
