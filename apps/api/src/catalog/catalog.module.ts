import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles';
import { AdminCatalogController, PublicCatalogController } from './catalog.controller';
import { ImageController } from './image.controller';
import { CatalogService } from './catalog.service';
@Module({imports:[AuthModule],controllers:[PublicCatalogController,AdminCatalogController,ImageController],providers:[CatalogService,RolesGuard]})
export class CatalogModule {}

