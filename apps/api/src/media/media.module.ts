import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles';
import { AdminMediaController, PublicMediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({ imports: [AuthModule], controllers: [PublicMediaController, AdminMediaController], providers: [MediaService, RolesGuard] })
export class MediaModule {}
