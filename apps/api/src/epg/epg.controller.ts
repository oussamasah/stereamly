import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
import { SourcesService } from '../sources/sources.service';
import { ImportEpgDto, MapChannelDto, ReminderDto } from './epg.dto';
import { EpgService } from './epg.service';

@Controller('epg')
export class PublicEpgController {
  constructor(private readonly epg: EpgService) {}
  @Get('guide') guide(@Query('channelId') channelId?: string) { return this.epg.guide(channelId); }
}

@UseGuards(AuthGuard)
@Controller('epg/me')
export class ReminderController {
  constructor(private readonly epg: EpgService) {}
  @Get('reminders') list(@Req() request: AuthenticatedRequest) { return this.epg.reminders(request.user.id); }
  @Post('reminders') create(@Req() request: AuthenticatedRequest, @Body() dto: ReminderDto) { return this.epg.reminder(request.user.id, dto.programId); }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.CONTENT_MANAGER, UserRole.TECHNICAL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/epg')
export class AdminEpgController {
  constructor(private readonly epg: EpgService, private readonly sources: SourcesService) {}
  @Get('sources') sourceList() { return this.sources.list(); }
  @Post('sources/:id/import') import(@Param('id') id: string, @Body() dto: ImportEpgDto) { return this.epg.import(id, dto.url); }
  @Get('sources/:id/mappings') mappings(@Param('id') id: string) { return this.epg.mappings(id); }
  @Patch('sources/:id/mappings/:externalId') map(@Param('id') id: string, @Param('externalId') externalId: string, @Body() dto: MapChannelDto) { return this.epg.map(id, externalId, dto.channelId); }
  @Get('availability') availability() { return this.epg.availability(); }
}
