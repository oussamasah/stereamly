import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { AuthGuard } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
export async function normalizeCatalogImage(buffer:Buffer){return sharp(buffer).resize(800,800,{fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();}
@UseGuards(AuthGuard,RolesGuard)
@Roles(UserRole.CONTENT_MANAGER,UserRole.SUPER_ADMIN)
@Controller('admin/catalog/images')
export class ImageController {
  @Post() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1}}))
  async upload(@UploadedFile() file?:Express.Multer.File){
    if(!file||!['image/png','image/jpeg','image/webp','image/avif'].includes(file.mimetype))throw new BadRequestException('INVALID_IMAGE');
    const metadata=await sharp(file.buffer).metadata(); if(!metadata.width||!metadata.height||metadata.width>4000||metadata.height>4000)throw new BadRequestException('INVALID_IMAGE_DIMENSIONS');
    const directory=join(process.cwd(),'uploads','catalog'); await mkdir(directory,{recursive:true}); const name=`${randomUUID()}.webp`;
    await writeFile(join(directory,name),await normalizeCatalogImage(file.buffer));
    return {url:`/media/catalog/${name}`,format:'webp'};
  }
}
