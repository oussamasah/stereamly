import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BindingDto, CollectionDto, EventDto } from './platform.dto';
import { deliveryUrl, eventWindow, publicUrl } from './delivery-policy';
@Injectable()
export class PlatformService {
    constructor(private readonly prisma: PrismaService) { }
    private cached?: { until: number; value: Awaited<ReturnType<PlatformService['buildSnapshot']>> };
    private building?: Promise<Awaited<ReturnType<PlatformService['buildSnapshot']>>>;
    async snapshot() {
        if (this.cached && this.cached.until > Date.now()) return this.cached.value;
        if (this.building) return this.building;
        this.building = this.buildSnapshot().then(value => {
            this.cached = { until: Date.now() + 15000, value };
            return value;
        }).finally(() => { this.building = undefined; });
        return this.building;
    }
    private async buildSnapshot() {
        const now = new Date();
        const [bindings, events, collections] = await this.prisma.$transaction([
            this.prisma.viewingBinding.findMany({ where: { enabled: true, expiresAt: { gt: now } }, orderBy: { updatedAt: 'desc' }, take: 2000 }),
            this.prisma.sportsEvent.findMany({ where: { published: true, endsAt: { gt: new Date(now.getTime() - 86400000) } }, orderBy: { startsAt: 'asc' }, take: 500 }),
            this.prisma.discoveryCollection.findMany({ where: { published: true }, orderBy: { position: 'asc' }, take: 30 }),
        ]);
        const channels = await this.prisma.channel.findMany({ where: { status: 'PUBLISHED', webAvailable: true, rights: { some: { approved: true, webAllowed: true, validFrom: { lte: now }, validUntil: { gt: now } } } },
            select: { id: true, slug: true, names: true, logoUrl: true, languageCode: true, countryCode: true, category: { select: { names: true } } }, orderBy: { sortOrder: 'asc' }, take: 5000 });
        const allowed = new Set([...channels.map(c => `channel:${c.id}`), ...events.filter(e => e.status === 'LIVE' && e.startsAt <= now && e.endsAt > now).map(e => `event:${e.id}`)]);
        return { version: 1, generatedAt: now.toISOString(), validUntil: new Date(now.getTime() + 60000).toISOString(),
            channels, events: events.map(event => ({ ...event, status: event.status === 'LIVE' && event.endsAt <= now ? 'FINISHED' : event.status })), collections,
            bindings: bindings.filter(b => b.target.startsWith('tmdb:') || allowed.has(b.target)).map(b => ({ id: b.id, target: b.target, label: b.label, kind: b.kind, url: b.url, countries: b.countries, expiresAt: b.expiresAt, evidenceUrl: b.evidenceUrl })) };
    }
    async overview() {
        const [bindings, events, collections, sources, channels, audits] = await this.prisma.$transaction([
            this.prisma.viewingBinding.findMany({ orderBy: { updatedAt: 'desc' }, take: 2000 }),
            this.prisma.sportsEvent.findMany({ orderBy: { startsAt: 'desc' }, take: 500 }),
            this.prisma.discoveryCollection.findMany({ orderBy: { position: 'asc' } }),
            this.prisma.sourceAccount.groupBy({ by: ['status'], orderBy: { status: 'asc' }, _count: { _all: true } }),
            this.prisma.channel.count(),
            this.prisma.platformAudit.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
        ]);
        return { bindings, events, collections, sources, channels, audits };
    }
    channels(search = '') {
        return this.prisma.channel.findMany({ where: { status: { not: 'ARCHIVED' }, ...(search ? { searchText: { contains: search, mode: 'insensitive' as const } } : {}) },
            select: { id: true, names: true, status: true, slug: true }, orderBy: { slug: 'asc' }, take: 100 });
    }
    async binding(dto: BindingDto, actorId: string, id?: string) {
        if (!dto.rightsConfirmed || !dto.browserConfirmed)
            throw new BadRequestException('RIGHTS_AND_BROWSER_CONFIRMATION_REQUIRED');
        if (new Date(dto.expiresAt) <= new Date())
            throw new BadRequestException('FUTURE_EXPIRY_REQUIRED');
        const url = deliveryUrl(dto.kind, dto.url);
        publicUrl(dto.evidenceUrl);
        if (dto.target.startsWith('channel:') && !await this.prisma.channel.count({ where: { id: dto.target.slice(8) } }))
            throw new BadRequestException('CHANNEL_NOT_FOUND');
        if (dto.target.startsWith('event:') && !await this.prisma.sportsEvent.count({ where: { id: dto.target.slice(6) } }))
            throw new BadRequestException('EVENT_NOT_FOUND');
        const { rightsConfirmed: _rights, browserConfirmed: _browser, ...value } = dto;
        void _rights;
        void _browser;
        const data = { ...value, url, expiresAt: new Date(dto.expiresAt), checkedAt: new Date() };
        return this.prisma.$transaction(async (tx) => {
            const saved = id ? await tx.viewingBinding.update({ where: { id }, data }) : await tx.viewingBinding.create({ data });
            if (dto.enabled && dto.target.startsWith('channel:'))
                await tx.channel.update({ where: { id: dto.target.slice(8) }, data: { status: 'PUBLISHED', webAvailable: true, publishedAt: new Date() } });
            await tx.platformAudit.create({ data: { actorId, action: 'BINDING_SAVED', entityId: saved.id } });
            return saved;
        });
    }
    async toggle(id: string, enabled: boolean, actorId: string) {
        const current = await this.prisma.viewingBinding.findUniqueOrThrow({ where: { id } });
        if (enabled && current.expiresAt <= new Date())
            throw new BadRequestException('REVIEW_EXPIRED_BINDING');
        return this.prisma.$transaction(async (tx) => {
            const saved = await tx.viewingBinding.update({ where: { id }, data: { enabled } });
            if (enabled && current.target.startsWith('channel:'))
                await tx.channel.update({ where: { id: current.target.slice(8) }, data: { status: 'PUBLISHED', webAvailable: true, publishedAt: new Date() } });
            await tx.platformAudit.create({ data: { actorId, action: enabled ? 'BINDING_ENABLED' : 'BINDING_DISABLED', entityId: id } });
            return saved;
        });
    }
    async event(dto: EventDto, actorId: string, id?: string) {
        eventWindow(dto.startsAt, dto.endsAt);
        if (dto.status === 'LIVE' && (new Date(dto.startsAt) > new Date() || new Date(dto.endsAt) <= new Date())) throw new BadRequestException('LIVE_EVENT_MUST_BE_IN_PROGRESS');
        const data = { ...dto, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) };
        return this.prisma.$transaction(async (tx) => {
            const saved = id ? await tx.sportsEvent.update({ where: { id }, data }) : await tx.sportsEvent.create({ data });
            await tx.platformAudit.create({ data: { actorId, action: 'EVENT_SAVED', entityId: saved.id } });
            return saved;
        });
    }
    async collection(dto: CollectionDto, actorId: string, id?: string) {
        if (['fr', 'en', 'ar'].some(l => typeof dto.names[l] !== 'string' || !dto.names[l].trim() || dto.names[l].length > 120))
            throw new BadRequestException('TRANSLATED_NAMES_REQUIRED');
        const data = { ...dto, names: dto.names as Prisma.InputJsonValue };
        return this.prisma.$transaction(async (tx) => {
            const saved = id ? await tx.discoveryCollection.update({ where: { id }, data }) : await tx.discoveryCollection.create({ data });
            await tx.platformAudit.create({ data: { actorId, action: 'COLLECTION_SAVED', entityId: saved.id } });
            return saved;
        });
    }
}
