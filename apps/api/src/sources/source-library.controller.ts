import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles, RolesGuard } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { PublishSourceChannelsDto } from './source.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.TECHNICAL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/sources')
export class SourceLibraryController {
 constructor(private readonly prisma: PrismaService) {}

 @Get(':id/library')
 async list(@Param('id') sourceId: string, @Query('kind') requestedKind?: string, @Query('documentary') requestedDocumentary?: string, @Query('page') requestedPage?: string, @Query('pageSize') requestedPageSize?: string, @Query('search') requestedSearch?: string, @Query('group') requestedGroup?: string) {
  if (!await this.prisma.sourceAccount.count({ where: { id: sourceId } })) throw new BadRequestException('SOURCE_NOT_FOUND');
  const kind = (['LIVE', 'MOVIE', 'SERIES'].includes(requestedKind ?? '') ? requestedKind : 'LIVE') as 'LIVE' | 'MOVIE' | 'SERIES';
  const documentary = requestedDocumentary === 'true', page = Math.max(1, Number(requestedPage) || 1), pageSize = Math.min(150, Math.max(20, Number(requestedPageSize) || 80)), search = requestedSearch?.trim().slice(0, 100), group = requestedGroup?.trim().slice(0, 200);
  const classification: Prisma.SourceCatalogItemWhereInput = documentary ? { OR: [{ groupName: { contains: 'document', mode: 'insensitive' } }, { displayName: { contains: 'document', mode: 'insensitive' } }] } : {};
  const base: Prisma.SourceCatalogItemWhereInput = { sourceId, kind, active: true, ...classification };
  const where: Prisma.SourceCatalogItemWhereInput = { ...base, ...(group ? { groupName: group } : {}), ...(search ? { AND: [{ OR: [{ displayName: { contains: search, mode: 'insensitive' } }, { groupName: { contains: search, mode: 'insensitive' } }] }] } : {}) };
  const [items, total, groups] = await this.prisma.$transaction([
   this.prisma.sourceCatalogItem.findMany({ where, select: { id: true, kind: true, displayName: true, groupName: true, normalized: true, channel: { select: { id: true, slug: true, status: true, webAvailable: true, logoUrl: true } }, mediaTitle: { select: { id: true, slug: true, type: true, status: true, images: { where: { type: 'POSTER' }, orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } } } } }, orderBy: [{ groupName: 'asc' }, { displayName: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
   this.prisma.sourceCatalogItem.count({ where }),
   this.prisma.sourceCatalogItem.groupBy({ by: ['groupName'], where: base, _count: { id: true }, orderBy: { groupName: 'asc' } }),
  ]);
  return { items: items.map(item => { const fallbackImage = String((item.normalized as Record<string, unknown>).logoUrl ?? '') || null, imageUrl = item.channel?.logoUrl ?? item.mediaTitle?.images[0]?.url ?? fallbackImage, status = item.channel?.status ?? item.mediaTitle?.status ?? 'DRAFT'; return { ...item, status, published: item.channel?.webAvailable ?? item.mediaTitle?.status === 'PUBLISHED', imageUrl, channel: item.channel ?? { id: item.mediaTitle?.id ?? item.id, slug: item.mediaTitle?.slug ?? item.id, status, webAvailable: item.mediaTitle?.status === 'PUBLISHED', logoUrl: imageUrl, category: { id: '', slug: item.groupName ?? 'media', names: { fr: item.groupName ?? 'Sans catégorie' } } } }; }), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), groups: groups.map(value => ({ name: value.groupName ?? 'Sans catégorie', value: value.groupName ?? '', count: typeof value._count === 'object' && value._count ? value._count.id ?? 0 : 0 })) };
 }

 @Post(':id/library/publish')
 async publish(@Param('id') sourceId: string, @Body() dto: PublishSourceChannelsDto, @Req() req: AuthenticatedRequest) {
  if (!dto.rightsConfirmed) throw new BadRequestException('RIGHTS_CONFIRMATION_REQUIRED');
  const items = await this.prisma.sourceCatalogItem.findMany({ where: { sourceId, id: { in: dto.itemIds }, active: true }, select: { id: true, kind: true, channelId: true, mediaTitleId: true } });
  if (items.length !== dto.itemIds.length) throw new BadRequestException('SOURCE_CONTENT_SELECTION_INVALID');
  const channelIds = items.filter(item => item.kind === 'LIVE' && item.channelId).map(item => item.channelId!), mediaIds = [...new Set(items.map(item => item.mediaTitleId).filter((value): value is string => !!value))], now = new Date(), validUntil = new Date(); validUntil.setUTCFullYear(validUntil.getUTCFullYear() + 1);
  await this.prisma.$transaction(async tx => { if (channelIds.length) { await tx.channel.updateMany({ where: { id: { in: channelIds } }, data: { status: 'PUBLISHED', webAvailable: true, publishedAt: now, archivedAt: null, ...(dto.categoryId ? { categoryId: dto.categoryId } : {}) } }); for (const channelId of channelIds) await tx.channelRight.upsert({ where: { channelId_countryCode: { channelId, countryCode: dto.countryCode } }, create: { channelId, countryCode: dto.countryCode, webAllowed: true, mobileAllowed: true, tvAllowed: true, validFrom: now, validUntil, approved: true, contractRef: 'ADMIN_CONFIRMED' }, update: { webAllowed: true, mobileAllowed: true, tvAllowed: true, validFrom: now, validUntil, approved: true, contractRef: 'ADMIN_CONFIRMED' } }); } if (mediaIds.length) await tx.mediaTitle.updateMany({ where: { id: { in: mediaIds } }, data: { status: 'PUBLISHED', publishedAt: now, archivedAt: null } }); await tx.sourceAuditEvent.create({ data: { sourceId, actorId: req.user.id, action: 'SOURCE_CONTENT_PUBLISHED', changes: { itemIds: dto.itemIds, channelIds, mediaIds, countryCode: dto.countryCode } } }); });
  return { published: channelIds.length + mediaIds.length };
 }
}
