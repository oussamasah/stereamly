import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
import { BindingDto, ChannelQueryDto, CollectionDto, EventDto, ToggleDto } from './platform.dto';
import { PlatformService } from './platform.service';
@Controller('platform')
export class PublicPlatformController {
    constructor(private readonly platform: PlatformService) { }
    @Get('snapshot')
    @Header('Cache-Control', 'public, max-age=15')
    snapshot() { return this.platform.snapshot(); }
}
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_ADMIN, UserRole.CONTENT_MANAGER)
@Controller('admin/platform')
export class PlatformController {
    constructor(private readonly platform: PlatformService) { }
    @Get()
    overview() { return this.platform.overview(); }
    @Get('channels')
    channels(
    @Query()
    query: ChannelQueryDto) { return this.platform.channels(query.search); }
    @Post('bindings')
    binding(
    @Body()
    dto: BindingDto, 
    @Req()
    req: AuthenticatedRequest) { return this.platform.binding(dto, req.user.id); }
    @Patch('bindings/:id')
    updateBinding(
    @Param('id')
    id: string, 
    @Body()
    dto: BindingDto, 
    @Req()
    req: AuthenticatedRequest) { return this.platform.binding(dto, req.user.id, id); }
    @Patch('bindings/:id/enabled')
    toggle(
    @Param('id')
    id: string, 
    @Body()
    dto: ToggleDto, 
    @Req()
    req: AuthenticatedRequest) { return this.platform.toggle(id, dto.enabled, req.user.id); }
    @Post('events')
    event(
    @Body()
    dto: EventDto, 
    @Req()
    req: AuthenticatedRequest) { return this.platform.event(dto, req.user.id); }
    @Patch('events/:id')
    updateEvent(
    @Param('id')
    id: string, 
    @Body()
    dto: EventDto, 
    @Req()
    req: AuthenticatedRequest) { return this.platform.event(dto, req.user.id, id); }
    @Post('collections')
    collection(
    @Body()
    dto: CollectionDto, 
    @Req()
    req: AuthenticatedRequest) { return this.platform.collection(dto, req.user.id); }
    @Patch('collections/:id')
    updateCollection(
    @Param('id')
    id: string, 
    @Body()
    dto: CollectionDto, 
    @Req()
    req: AuthenticatedRequest) { return this.platform.collection(dto, req.user.id, id); }
}
