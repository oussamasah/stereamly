import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles';
import { AdminProvidersController, PublicProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({ imports: [AuthModule], controllers: [PublicProvidersController, AdminProvidersController], providers: [ProvidersService, RolesGuard] })
export class ProvidersModule {}
