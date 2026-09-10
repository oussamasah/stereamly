import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
import { GenreDto, MediaQueryDto, MediaTitleDto } from './media.dto';
import { MediaService } from './media.service';

@Controller('media')
export class PublicMediaController {
  constructor(private readonly media: MediaService) {}
  @Get('genres') genres() { return this.media.listGenres(); }
  @Get('titles') titles(@Query() query: MediaQueryDto) { return this.media.publicTitles(query); }
  @Get('titles/:slug') title(@Param('slug') slug:string) { return this.media.publicTitle(slug); }
}

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.CONTENT_MANAGER, UserRole.SUPER_ADMIN)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}
  @Get('genres') genres() { return this.media.listGenres(); }
  @Post('genres') createGenre(@Body() dto: GenreDto) { return this.media.createGenre(dto); }
  @Patch('genres/:id') updateGenre(@Param('id') id: string, @Body() dto: GenreDto) { return this.media.updateGenre(id, dto); }
  @Get('titles') titles() { return this.media.adminTitles(); }
  @Get('titles/:id/preview') preview(@Param('id') id: string) { return this.media.adminTitle(id); }
  @Post('titles') create(@Body() dto: MediaTitleDto) { return this.media.createTitle(dto); }
  @Patch('titles/:id') update(@Param('id') id: string, @Body() dto: MediaTitleDto) { return this.media.updateTitle(id, dto); }
  @Delete('titles/:id') archive(@Param('id') id: string) { return this.media.archiveTitle(id); }
}
