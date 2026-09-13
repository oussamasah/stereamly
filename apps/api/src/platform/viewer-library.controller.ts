import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested, IsBoolean, IsNumber, Matches, Max, Min } from 'class-validator';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { targetPattern } from './platform.dto';
class LibraryItemDto {
  @Matches(targetPattern) target!: string;
  @IsBoolean() saved!: boolean;
  @IsNumber({ allowInfinity: false, allowNaN: false }) @Min(0) @Max(604800) positionSeconds!: number;
}
class LibraryBatchDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => LibraryItemDto) items!: LibraryItemDto[];
}
@Controller('viewer/library')
@UseGuards(AuthGuard)
export class ViewerLibraryController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list(@Req() request: AuthenticatedRequest) {
    return this.prisma.viewerLibraryItem.findMany({ where: { userId: request.user.id }, select: { target: true, saved: true, positionSeconds: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1000 });
  }
  @Put() async save(@Req() request: AuthenticatedRequest, @Body() dto: LibraryBatchDto) {
    const userId = request.user.id;
    return this.prisma.$transaction(async tx => {
      for (const item of dto.items) await tx.viewerLibraryItem.upsert({ where: { userId_target: { userId, target: item.target } }, create: { userId, ...item }, update: item });
      const stale = await tx.viewerLibraryItem.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, skip: 1000, select: { id: true } });
      if (stale.length) await tx.viewerLibraryItem.deleteMany({ where: { userId, id: { in: stale.map(item => item.id) } } });
      return { saved: dto.items.length };
    }, { timeout: 20000 });
  }
}
