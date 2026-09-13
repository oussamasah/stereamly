import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
import { ProviderQueryDto, StreamProviderDto } from './provider.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class PublicProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=30')
  active(@Query() query: ProviderQueryDto) {
    return this.providers.active(query.category ?? 'vod');
  }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_ADMIN, UserRole.CONTENT_MANAGER)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get() list() { return this.providers.adminList(); }
  @Post() create(@Body() dto: StreamProviderDto) { return this.providers.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: StreamProviderDto) { return this.providers.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.providers.remove(id); }
}
