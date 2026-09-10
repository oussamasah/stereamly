import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CatalogQueryDto, CategoryDto, ChannelDto, PackageDto, QuoteDto } from './catalog.dto';
import { calculateQuote } from './pricing';
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}
  private json(value?: Record<string,string>) { return value as Prisma.InputJsonValue | undefined; }
  private async clearCache() { try { await this.redis.ensureConnected(); const keys = await this.redis.client.keys('catalog:*'); if (keys.length) await this.redis.client.del(...keys); } catch { /* cache is optional */ } }
  createCategory(dto: CategoryDto) { return this.prisma.category.create({ data: { ...dto, names: this.json(dto.names)! } }); }
  async updateCategory(id: string, dto: CategoryDto) { const value = await this.prisma.category.update({ where: { id }, data: { ...dto, names: this.json(dto.names)! } }); await this.clearCache(); return value; }
  listCategories() { return this.prisma.category.findMany({ orderBy: [{ sortOrder:'asc' }, { slug:'asc' }] }); }
  async archiveCategory(id: string) { const used = await this.prisma.channel.count({ where: { categoryId:id, status:{ not:'ARCHIVED' } } }); if (used) throw new BadRequestException('CATEGORY_IN_USE'); const value = await this.prisma.category.update({ where:{ id }, data:{ active:false } }); await this.clearCache(); return value; }
  async createChannel(dto: ChannelDto) { this.validateTranslations(dto.names); this.validateDates(dto.rights); this.validateChannelPublication(dto); const value = await this.prisma.channel.create({ data: this.channelData(dto) as Prisma.ChannelCreateInput }); await this.clearCache(); return this.adminChannel(value.id); }
  async updateChannel(id: string, dto: ChannelDto) { await this.requireChannel(id); this.validateTranslations(dto.names); this.validateDates(dto.rights); this.validateChannelPublication(dto); await this.prisma.channel.update({ where:{ id }, data: this.channelData(dto, true) as Prisma.ChannelUpdateInput }); await this.clearCache(); return this.adminChannel(id); }
  async archiveChannel(id: string) { await this.requireChannel(id); const value=await this.prisma.channel.update({ where:{ id }, data:{ status:'ARCHIVED', archivedAt:new Date() } }); await this.clearCache(); return value; }
  adminChannels() { return this.prisma.channel.findMany({ include:{ category:true, prices:true, rights:true, packages:true }, orderBy:[{sortOrder:'asc'},{slug:'asc'}] }); }
  adminChannel(id:string) { return this.prisma.channel.findUniqueOrThrow({ where:{ id }, include:{ category:true, prices:true, rights:true, packages:true } }); }
  async createPackage(dto: PackageDto) { this.validateTranslations(dto.names); await this.validatePackagePublication(dto); const value=await this.prisma.package.create({ data:this.packageData(dto) as Prisma.PackageCreateInput }); await this.clearCache(); return this.adminPackage(value.id); }
  async updatePackage(id:string,dto:PackageDto) { await this.requirePackage(id); this.validateTranslations(dto.names); await this.validatePackagePublication(dto); await this.prisma.package.update({ where:{id},data:this.packageData(dto,true) as Prisma.PackageUpdateInput }); await this.clearCache(); return this.adminPackage(id); }
  async archivePackage(id:string) { const value=await this.prisma.package.update({ where:{id},data:{status:'ARCHIVED',archivedAt:new Date()} }); await this.clearCache(); return value; }
  adminPackages() { return this.prisma.package.findMany({include:{prices:true,channels:{include:{channel:true}}},orderBy:[{sortOrder:'asc'},{slug:'asc'}]}); }
  adminPackage(id:string) { return this.prisma.package.findUniqueOrThrow({where:{id},include:{prices:true,channels:{include:{channel:true}}}}); }
  async publicChannels(query: CatalogQueryDto) {
    const key=`catalog:channels:${JSON.stringify(query)}`; const cached=await this.getCache(key); if(cached)return cached;
    const now=new Date(); const visibility: Prisma.ChannelWhereInput={ OR:[{status:'PUBLISHED'},{status:'SCHEDULED',scheduledFor:{lte:now}}], rights:{some:{countryCode:{in:[query.country,'ALL']},approved:true,validFrom:{lte:now},validUntil:{gt:now}}} };
    const where:Prisma.ChannelWhereInput={AND:[visibility,query.language?{languageCode:query.language}:{},query.category?{category:{slug:query.category}}:{},query.search?{searchText:{contains:query.search,mode:'insensitive'}}:{}]};
    const [items,total]=await this.prisma.$transaction([this.prisma.channel.findMany({where,include:{category:true,prices:{where:{currency:query.currency,active:true}}},orderBy:[{featured:'desc'},{sortOrder:'asc'}],skip:(query.page-1)*query.pageSize,take:query.pageSize}),this.prisma.channel.count({where})]);
    return this.setCache(key,{items,total,page:query.page,pageSize:query.pageSize});
  }
  async publicPackages(query: CatalogQueryDto) {
    const key=`catalog:packages:${JSON.stringify(query)}`; const cached=await this.getCache(key); if(cached)return cached; const now=new Date();
    const where:Prisma.PackageWhereInput={AND:[{OR:[{status:'PUBLISHED'},{status:'SCHEDULED',scheduledFor:{lte:now}}]},{OR:[{allowedCountries:{has:query.country}},{allowedCountries:{has:'ALL'}}]},query.search?{searchText:{contains:query.search,mode:'insensitive'}}:{}]};
    const [items,total]=await this.prisma.$transaction([this.prisma.package.findMany({where,include:{prices:{where:{currency:query.currency,active:true}},channels:{include:{channel:{select:{id:true,slug:true,names:true,logoUrl:true}}}}},orderBy:[{featured:'desc'},{sortOrder:'asc'}],skip:(query.page-1)*query.pageSize,take:query.pageSize}),this.prisma.package.count({where})]);
    return this.setCache(key,{items,total,page:query.page,pageSize:query.pageSize});
  }
  async publicChannel(slug:string,country:string,currency:string){const now=new Date();const value=await this.prisma.channel.findFirst({where:{slug,OR:[{status:'PUBLISHED'},{status:'SCHEDULED',scheduledFor:{lte:now}}],rights:{some:{countryCode:{in:[country,'ALL']},approved:true,validFrom:{lte:now},validUntil:{gt:now}}}},include:{category:true,prices:{where:{currency,active:true}},playbackVariants:{where:{enabled:true},select:{id:true,label:true,quality:true,languageCode:true,protocol:true}}}});if(!value)throw new NotFoundException('CHANNEL_NOT_FOUND');return value;}
  async quote(dto: QuoteDto) {
    if(!dto.channelIds.length) return {currency:dto.currency,period:dto.period,totalMinor:0,recommendations:[]}; const now=new Date();
    const channels=await this.prisma.channel.findMany({where:{id:{in:dto.channelIds},OR:[{status:'PUBLISHED'},{status:'SCHEDULED',scheduledFor:{lte:now}}],rights:{some:{countryCode:{in:[dto.country,'ALL']},approved:true,validFrom:{lte:now},validUntil:{gt:now}}}},include:{prices:{where:{currency:dto.currency,period:dto.period,active:true}}}});
    if(channels.length!==dto.channelIds.length||channels.some(c=>c.prices.length!==1)) throw new BadRequestException('CHANNEL_NOT_AVAILABLE_OR_PRICED');
    const packages=await this.prisma.package.findMany({where:{AND:[{OR:[{status:'PUBLISHED'},{status:'SCHEDULED',scheduledFor:{lte:now}}]},{OR:[{allowedCountries:{has:dto.country}},{allowedCountries:{has:'ALL'}}]}],prices:{some:{currency:dto.currency,period:dto.period,active:true}}},include:{prices:{where:{currency:dto.currency,period:dto.period,active:true}},channels:true}});
    const result=calculateQuote(channels.map(c=>({id:c.id,amountMinor:c.prices[0].amountMinor})),packages.map(p=>({id:p.id,name:this.localized(p.names,'fr'),amountMinor:p.prices[0].amountMinor,channelIds:p.channels.map(c=>c.channelId)})));
    return {currency:dto.currency,period:dto.period,...result};
  }
  private channelData(dto:ChannelDto,replace=false):Prisma.ChannelCreateInput|Prisma.ChannelUpdateInput { const base={slug:dto.slug,names:this.json(dto.names)!,searchText:Object.values(dto.names).join(' '),description:this.json(dto.description),logoUrl:dto.logoUrl,languageCode:dto.languageCode,countryCode:dto.countryCode,sortOrder:dto.sortOrder??0,status:dto.status??PublicationStatus.DRAFT,webAvailable:dto.webAvailable??false,featured:dto.featured??false,scheduledFor:dto.scheduledFor?new Date(dto.scheduledFor):null,publishedAt:dto.status==='PUBLISHED'?new Date():undefined,category:{connect:{id:dto.categoryId}},prices:{[replace?'deleteMany':'create']:replace?{}:dto.prices, ...(replace?{create:dto.prices}:{})},rights:{[replace?'deleteMany':'create']:replace?{}:dto.rights.map(r=>({...r,validFrom:new Date(r.validFrom),validUntil:new Date(r.validUntil)})),...(replace?{create:dto.rights.map(r=>({...r,validFrom:new Date(r.validFrom),validUntil:new Date(r.validUntil)}))}:{})}}; return base as Prisma.ChannelCreateInput|Prisma.ChannelUpdateInput; }
  private packageData(dto:PackageDto,replace=false):Prisma.PackageCreateInput|Prisma.PackageUpdateInput { return {slug:dto.slug,names:this.json(dto.names)!,searchText:Object.values(dto.names).join(' '),description:this.json(dto.description),badge:this.json(dto.badge),status:dto.status??'DRAFT',featured:dto.featured??false,sortOrder:dto.sortOrder??0,maxDevices:dto.maxDevices,maxConcurrentStreams:dto.maxConcurrentStreams,allowedCountries:dto.allowedCountries,scheduledFor:dto.scheduledFor?new Date(dto.scheduledFor):null,publishedAt:dto.status==='PUBLISHED'?new Date():undefined,channels:{...(replace?{deleteMany:{}}:{}),create:dto.channelIds.map(channelId=>({channel:{connect:{id:channelId}}}))},prices:{...(replace?{deleteMany:{}}:{}),create:dto.prices}} as Prisma.PackageCreateInput|Prisma.PackageUpdateInput; }
  private validateChannelPublication(dto:ChannelDto) { if(!['PUBLISHED','SCHEDULED'].includes(dto.status??''))return; const at=dto.status==='SCHEDULED'&&dto.scheduledFor?new Date(dto.scheduledFor):new Date(); if(!dto.prices.length||!dto.rights.some(r=>r.approved&&new Date(r.validFrom)<=at&&new Date(r.validUntil)>at))throw new BadRequestException('CHANNEL_NOT_PUBLISHABLE'); }
  private async validatePackagePublication(dto:PackageDto) { if(!['PUBLISHED','SCHEDULED'].includes(dto.status??''))return; if(!dto.prices.length||!dto.channelIds.length)throw new BadRequestException('PACKAGE_NOT_PUBLISHABLE'); const count=await this.prisma.channel.count({where:{id:{in:dto.channelIds},status:{not:'ARCHIVED'}}}); if(count!==dto.channelIds.length)throw new BadRequestException('PACKAGE_CONTAINS_INVALID_CHANNEL'); }
  private validateTranslations(value:Record<string,string>){if(!value.fr||!value.en||!value.ar)throw new BadRequestException('FR_EN_AR_TRANSLATIONS_REQUIRED');}
  private validateDates(rights:ChannelDto['rights']){if(rights.some(r=>new Date(r.validFrom)>=new Date(r.validUntil)))throw new BadRequestException('INVALID_RIGHT_DATES');}
  private async requireChannel(id:string){if(!await this.prisma.channel.findUnique({where:{id},select:{id:true}}))throw new NotFoundException('CHANNEL_NOT_FOUND');}
  private async requirePackage(id:string){if(!await this.prisma.package.findUnique({where:{id},select:{id:true}}))throw new NotFoundException('PACKAGE_NOT_FOUND');}
  private localized(value:Prisma.JsonValue,locale:string){const map=value as Record<string,string>;return map[locale]??map.fr??Object.values(map)[0]??'';}
  private async getCache(key:string){try{await this.redis.ensureConnected();const value=await this.redis.client.get(key);return value?JSON.parse(value):null;}catch{return null;}}
  private async setCache(key:string,value:unknown){try{await this.redis.ensureConnected();await this.redis.client.set(key,JSON.stringify(value),'EX',300);}catch{/* optional */}return value;}
}
