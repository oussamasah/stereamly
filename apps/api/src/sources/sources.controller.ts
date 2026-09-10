import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { UserRole } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
import { PublishSourceChannelsDto, SourceAccountDto } from './source.dto';
import { SourcesService } from './sources.service';

@UseGuards(AuthGuard,RolesGuard)
@Roles(UserRole.TECHNICAL_ADMIN,UserRole.SUPER_ADMIN)
@Controller('admin/sources')
export class SourcesController{
 constructor(private readonly sources:SourcesService){}
 @Get() list(){return this.sources.list();}
 @Get(':id/channels') channels(@Param('id')id:string,@Query('page')page?:string,@Query('pageSize')pageSize?:string,@Query('search')search?:string,@Query('group')group?:string){return this.sources.channels(id,{page:Number(page)||1,pageSize:Number(pageSize)||80,search,group});}
 @Post(':id/channels/publish') publishChannels(@Param('id')id:string,@Body()dto:PublishSourceChannelsDto,@Req()req:AuthenticatedRequest){return this.sources.publishChannels(id,dto,req.user.id);}
 @Post('upload-m3u') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:10*1024*1024,files:1}}))
 uploadM3u(@UploadedFile()file:Express.Multer.File|undefined,@Body()body:Record<string,string>,@Req()req:AuthenticatedRequest){
  if(!file)throw new BadRequestException('M3U_FILE_REQUIRED');
  if(!/\.(m3u|m3u8)$/i.test(file.originalname))throw new BadRequestException('M3U_FILE_EXTENSION_REQUIRED');
  return this.sources.createUploadedM3u(body.name,file.buffer.toString('utf8'),req.user.id,{syncLive:body.syncLive!=='false',syncMovies:body.syncMovies!=='false',syncSeries:body.syncSeries!=='false'});
 }
 @Get(':id') get(@Param('id')id:string){return this.sources.get(id);}
 @Post() create(@Body()dto:SourceAccountDto,@Req()req:AuthenticatedRequest){return this.sources.create(dto,req.user.id);}
 @Patch(':id') update(@Param('id')id:string,@Body()dto:SourceAccountDto,@Req()req:AuthenticatedRequest){return this.sources.update(id,dto,req.user.id);}
 @Post(':id/test') test(@Param('id')id:string,@Req()req:AuthenticatedRequest){return this.sources.test(id,req.user.id);}
 @Post(':id/enable') enable(@Param('id')id:string,@Req()req:AuthenticatedRequest){return this.sources.enable(id,req.user.id);}
 @Post(':id/disable') disable(@Param('id')id:string,@Req()req:AuthenticatedRequest){return this.sources.disable(id,req.user.id);}
 @Delete(':id') remove(@Param('id')id:string,@Req()req:AuthenticatedRequest){return this.sources.remove(id,req.user.id);}
}
