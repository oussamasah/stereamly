import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, Prisma, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenreDto, MediaQueryDto, MediaTitleDto } from './media.dto';

const includeTitle = {
  movie: true,
  series: { include: { seasons: { include: { episodes: { include: { images: true, externalIds: true, playbackVariants: { orderBy: { priority: 'asc' as const } } }, orderBy: [{ sortOrder: 'asc' as const }, { episodeNumber: 'asc' as const }] } }, orderBy: [{ sortOrder: 'asc' as const }, { seasonNumber: 'asc' as const }] } } },
  genres: { include: { genre: true } }, images: { orderBy: { sortOrder: 'asc' as const } }, externalIds: true,
  playbackVariants: { orderBy: { priority: 'asc' as const } }, credits: { include: { person: true }, orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  listGenres() { return this.prisma.genre.findMany({ orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }] }); }
  createGenre(dto: GenreDto) { this.translations(dto.names); return this.prisma.genre.create({ data: { ...dto, names: this.json(dto.names)! } }); }
  updateGenre(id: string, dto: GenreDto) { this.translations(dto.names); return this.prisma.genre.update({ where: { id }, data: { ...dto, names: this.json(dto.names)! } }); }

  adminTitles() { return this.prisma.mediaTitle.findMany({ include: includeTitle, orderBy: [{ updatedAt: 'desc' }] }); }
  adminTitle(id: string) { return this.prisma.mediaTitle.findUniqueOrThrow({ where: { id }, include: includeTitle }); }

  async createTitle(dto: MediaTitleDto) {
    this.validate(dto);
    await this.ensureUniqueExternalIds(dto.externalIds, dto.seasons);
    const value = await this.prisma.mediaTitle.create({ data: this.data(dto) });
    return this.adminTitle(value.id);
  }

  async updateTitle(id: string, dto: MediaTitleDto) {
    const old = await this.prisma.mediaTitle.findUnique({ where: { id }, select: { id: true } });
    if (!old) throw new NotFoundException('MEDIA_NOT_FOUND');
    this.validate(dto);
    await this.ensureUniqueExternalIds(dto.externalIds, dto.seasons, id);
    await this.prisma.$transaction(async tx => {
      await tx.movie.deleteMany({ where: { mediaTitleId: id } });
      await tx.series.deleteMany({ where: { mediaTitleId: id } });
      await tx.mediaTitle.update({ where: { id }, data: { genres: { deleteMany: {} }, images: { deleteMany: {} }, externalIds: { deleteMany: {} }, playbackVariants: { deleteMany: {} }, credits: { deleteMany: {} } } });
      await tx.mediaTitle.update({ where: { id }, data: this.data(dto, true) });
    });
    return this.adminTitle(id);
  }

  async archiveTitle(id: string) {
    return this.prisma.mediaTitle.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
  }

  async publicTitles(query: MediaQueryDto) {
    const now = new Date();
    const where: Prisma.MediaTitleWhereInput = { AND: [
      { OR: [{ status: 'PUBLISHED' }, { status: 'SCHEDULED', scheduledFor: { lte: now } }] },
      query.type ? { type: query.type } : {}, query.search ? { searchText: { contains: query.search, mode: 'insensitive' } } : {},
      query.genre ? { genres: { some: { genre: { slug: query.genre, active: true } } } } : {},
      query.language ? { originalLanguage: query.language } : {}, query.country ? { countryCodes: { has: query.country } } : {}, query.year ? { releaseYear: query.year } : {}, query.quality ? { playbackVariants: { some: { quality: query.quality, enabled: true } } } : {},
    ] };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaTitle.findMany({ where, include: { movie: true, series: { include: { seasons: { include: { episodes: true }, orderBy: { seasonNumber: 'asc' } } } }, genres: { include: { genre: true } }, images: { orderBy: { sortOrder: 'asc' } }, playbackVariants:{where:{enabled:true},select:{quality:true,languageCode:true}} }, orderBy: query.sort==='rating'?{rating:'desc'}:query.sort==='year'?{releaseYear:'desc'}:query.sort==='title'?{slug:'asc'}:[{ featured: 'desc' }, { publishedAt: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.mediaTitle.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
  async publicTitle(slug:string){const now=new Date();const value=await this.prisma.mediaTitle.findFirst({where:{slug,OR:[{status:'PUBLISHED'},{status:'SCHEDULED',scheduledFor:{lte:now}}]},include:{movie:true,series:{include:{seasons:{include:{episodes:{include:{images:true},orderBy:[{sortOrder:'asc'},{episodeNumber:'asc'}]}},orderBy:[{sortOrder:'asc'},{seasonNumber:'asc'}]}}},genres:{include:{genre:true}},images:{orderBy:{sortOrder:'asc'}},credits:{include:{person:true},orderBy:{sortOrder:'asc'}},playbackVariants:{where:{enabled:true},select:{id:true,label:true,quality:true,languageCode:true,protocol:true}}}});if(!value)throw new NotFoundException('MEDIA_NOT_FOUND');return value;}

  private data(dto: MediaTitleDto, update = false): Prisma.MediaTitleCreateInput {
    const episode = (value: MediaTitleDto['seasons'][number]['episodes'][number]) => ({ episodeNumber: value.episodeNumber, names: this.json(value.names)!, synopsis: this.json(value.synopsis), durationSec: value.durationSec, airedAt: value.airedAt ? new Date(value.airedAt) : undefined, sortOrder: value.sortOrder ?? value.episodeNumber, images: { create: value.images }, externalIds: { create: value.externalIds }, playbackVariants: { create: value.playbackVariants.map(v => ({ ...v, priority: v.priority ?? 100, enabled: v.enabled ?? true })) } });
    const base: Prisma.MediaTitleCreateInput = {
      slug: dto.slug, type: dto.type, names: this.json(dto.names)!, alternativeNames: this.json(dto.alternativeNames), synopsis: this.json(dto.synopsis),
      searchText: [...Object.values(dto.names), ...Object.values(dto.alternativeNames ?? {})].join(' '), originalLanguage: dto.originalLanguage,
      countryCodes: dto.countryCodes, releaseYear: dto.releaseYear, ageRating: dto.ageRating, rating: dto.rating, trailerUrl: dto.trailerUrl,
      status: dto.status ?? PublicationStatus.DRAFT, featured: dto.featured ?? false, scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      publishedAt: dto.status === 'PUBLISHED' ? new Date() : undefined,
      genres: { create: dto.genreIds.map(genreId => ({ genre: { connect: { id: genreId } } })) }, images: { create: dto.images }, externalIds: { create: dto.externalIds }, credits: { create: dto.credits.map(value => ({ person: { connect: { id: value.personId } }, type: value.type, character: value.character, sortOrder: value.sortOrder ?? 0 })) },
      playbackVariants: { create: dto.playbackVariants.map(v => ({ ...v, priority: v.priority ?? 100, enabled: v.enabled ?? true })) },
      ...(dto.type === MediaType.MOVIE ? { movie: { create: { durationSec: dto.durationSec! } } } : { series: { create: { seriesStatus: dto.seriesStatus, seasons: { create: dto.seasons.map(s => ({ seasonNumber: s.seasonNumber, names: this.json(s.names), synopsis: this.json(s.synopsis), releaseYear: s.releaseYear, sortOrder: s.sortOrder ?? s.seasonNumber, episodes: { create: s.episodes.map(episode) } })) } } } }),
    };
    if (update) delete (base as { publishedAt?: Date }).publishedAt;
    return base;
  }

  private validate(dto: MediaTitleDto) {
    this.translations(dto.names);
    if (dto.type === 'MOVIE' && (!dto.durationSec || dto.seasons.length)) throw new BadRequestException('MOVIE_REQUIRES_DURATION_AND_NO_SEASONS');
    if (dto.type === 'SERIES' && dto.durationSec) throw new BadRequestException('SERIES_CANNOT_HAVE_MOVIE_DURATION');
    const seasonNumbers = dto.seasons.map(s => s.seasonNumber);
    if (new Set(seasonNumbers).size !== seasonNumbers.length) throw new BadRequestException('DUPLICATE_SEASON_NUMBER');
    for (const season of dto.seasons) { const numbers = season.episodes.map(e => e.episodeNumber); if (new Set(numbers).size !== numbers.length) throw new BadRequestException('DUPLICATE_EPISODE_NUMBER'); for (const value of season.episodes) this.translations(value.names); }
    if (dto.status === 'SCHEDULED' && (!dto.scheduledFor || new Date(dto.scheduledFor) <= new Date())) throw new BadRequestException('FUTURE_SCHEDULE_REQUIRED');
  }

  private async ensureUniqueExternalIds(titleIds: ExternalId[], seasons: MediaTitleDto['seasons'], currentId?: string) {
    const ids = [...titleIds, ...seasons.flatMap(s => s.episodes.flatMap(e => e.externalIds))];
    const keys = ids.map(v => `${v.provider}:${v.externalId}`);
    if (new Set(keys).size !== keys.length) throw new BadRequestException('DUPLICATE_EXTERNAL_ID');
    if (!ids.length) return;
    const found = await this.prisma.externalId.findMany({ where: { OR: ids.map(v => ({ provider: v.provider, externalId: v.externalId })) }, include: { episode: { include: { season: true } } } });
    if (found.some(item => !currentId || (item.mediaTitleId !== currentId && item.episode?.season.seriesId !== currentId))) throw new BadRequestException('EXTERNAL_ID_ALREADY_USED');
  }
  private translations(value: Record<string, string>) { if (!value.fr || !value.en || !value.ar) throw new BadRequestException('FR_EN_AR_TRANSLATIONS_REQUIRED'); }
  private json(value?: Record<string, string>) { return value as Prisma.InputJsonValue | undefined; }
}

type ExternalId = { provider: string; externalId: string };
