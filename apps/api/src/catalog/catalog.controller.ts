import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
import { CatalogQueryDto, CategoryDto, ChannelDto, PackageDto, QuoteDto } from './catalog.dto';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('categories') categories() { return this.catalog.listCategories(); }
  @Get('channels') channels(@Query() query: CatalogQueryDto) { return this.catalog.publicChannels(query); }
  @Get('channels/:slug') channel(@Param('slug')slug:string,@Query('country')country='FR',@Query('currency')currency='EUR'){return this.catalog.publicChannel(slug,country,currency);}
  @Get('packages') packages(@Query() query: CatalogQueryDto) { return this.catalog.publicPackages(query); }
  @Post('quote') quote(@Body() dto: QuoteDto) { return this.catalog.quote(dto); }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.CONTENT_MANAGER, UserRole.SUPER_ADMIN)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('categories') categories() { return this.catalog.listCategories(); }
  @Post('categories') createCategory(@Body() dto: CategoryDto) { return this.catalog.createCategory(dto); }
  @Patch('categories/:id') updateCategory(@Param('id') id:string,@Body() dto:CategoryDto){return this.catalog.updateCategory(id,dto);}
  @Delete('categories/:id') archiveCategory(@Param('id') id:string){return this.catalog.archiveCategory(id);}
  @Get('channels') channels(){return this.catalog.adminChannels();}
  @Get('channels/:id/preview') previewChannel(@Param('id') id:string){return this.catalog.adminChannel(id);}
  @Post('channels') createChannel(@Body() dto:ChannelDto){return this.catalog.createChannel(dto);}
  @Patch('channels/:id') updateChannel(@Param('id') id:string,@Body() dto:ChannelDto){return this.catalog.updateChannel(id,dto);}
  @Delete('channels/:id') archiveChannel(@Param('id') id:string){return this.catalog.archiveChannel(id);}
  @Get('packages') packages(){return this.catalog.adminPackages();}
  @Get('packages/:id/preview') previewPackage(@Param('id') id:string){return this.catalog.adminPackage(id);}
  @Post('packages') createPackage(@Body() dto:PackageDto){return this.catalog.createPackage(dto);}
  @Patch('packages/:id') updatePackage(@Param('id') id:string,@Body() dto:PackageDto){return this.catalog.updatePackage(id,dto);}
  @Delete('packages/:id') archivePackage(@Param('id') id:string){return this.catalog.archivePackage(id);}
}
