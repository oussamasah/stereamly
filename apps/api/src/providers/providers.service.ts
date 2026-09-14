import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StreamProviderDto } from './provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  active(category = 'vod') {
    return this.prisma.streamProvider.findMany({
      where: { category, isActive: true },
      orderBy: [{ rank: 'asc' }, { name: 'asc' }],
    });
  }

  adminList() {
    return this.prisma.streamProvider.findMany({ orderBy: [{ category: 'asc' }, { rank: 'asc' }, { name: 'asc' }] });
  }

  create(dto: StreamProviderDto) {
    this.validate(dto);
    return this.prisma.streamProvider.create({ data: this.clean(dto) });
  }

  async update(id: string, dto: StreamProviderDto) {
    await this.ensure(id);
    this.validate(dto);
    return this.prisma.streamProvider.update({ where: { id }, data: this.clean(dto) });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.streamProvider.delete({ where: { id } });
    return { ok: true };
  }

  private clean(dto: StreamProviderDto) {
    return {
      name: dto.name,
      slug: dto.slug,
      category: dto.category,
      movieTemplate: dto.movieTemplate || null,
      tvTemplate: dto.tvTemplate || null,
      streamUrl: dto.streamUrl || null,
      isActive: dto.isActive ?? true,
      rank: dto.rank ?? 0,
    };
  }

  private validate(dto: StreamProviderDto) {
    if (dto.category === 'vod' && !dto.movieTemplate && !dto.tvTemplate) {
      throw new BadRequestException('VOD_TEMPLATE_REQUIRED');
    }
    if ((dto.category === 'live' || dto.category === 'sports') && !dto.streamUrl) {
      throw new BadRequestException('LIVE_TEMPLATE_REQUIRED');
    }
    if (dto.movieTemplate && !dto.movieTemplate.includes('{id}')) {
      throw new BadRequestException('MOVIE_TEMPLATE_ID_REQUIRED');
    }
    if (dto.tvTemplate && ['{id}', '{s}', '{e}'].some((token) => !dto.tvTemplate!.includes(token))) {
      throw new BadRequestException('SERIES_TEMPLATE_VARIABLES_REQUIRED');
    }
  }

  private async ensure(id: string) {
    const found = await this.prisma.streamProvider.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('STREAM_PROVIDER_NOT_FOUND');
  }
}
