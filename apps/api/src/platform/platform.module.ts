import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles';
import { PlatformController, PublicPlatformController } from './platform.controller';
import { UsersController } from './users.controller';
import { ViewerLibraryController } from './viewer-library.controller';
import { PlatformService } from './platform.service';
@Module({ imports: [AuthModule], controllers: [PlatformController, PublicPlatformController, ViewerLibraryController, UsersController], providers: [PlatformService, RolesGuard] })
export class PlatformModule {
}
