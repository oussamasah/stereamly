import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SourceStatus, SourceTestOutcome } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublishSourceChannelsDto, SourceAccountDto } from './source.dto';
import { ConnectorResult, SourceConnectorsService } from './source-connectors.service';
import { SourceCredentials, SourceVaultService } from './source-vault.service';
import { UrlPolicyService } from './url-policy.service';

const secrets=(dto:SourceAccountDto):SourceCredentials=>({username:dto.username,password:dto.password,macAddress:dto.macAddress?.toUpperCase(),serialNumber:dto.serialNumber,deviceId:dto.deviceId,deviceId2:dto.deviceId2,signature:dto.signature,apiToken:dto.apiToken});
@Injectable()
export class SourcesService {
 constructor(private readonly prisma:PrismaService,private readonly vault:SourceVaultService,private readonly connectors:SourceConnectorsService,private readonly policy:UrlPolicyService){}
 async list(){const rows=await this.prisma.sourceAccount.findMany({include:{secret:true,testRuns:{orderBy:{createdAt:'desc'},take:1}},orderBy:{updatedAt:'desc'}});return rows.map(row=>this.public(row));}
 async get(id:string){const row=await this.prisma.sourceAccount.findUnique({where:{id},include:{secret:true,testRuns:{orderBy:{createdAt:'desc'},take:20},auditEvents:{orderBy:{createdAt:'desc'},take:30,include:{actor:{select:{id:true,displayName:true}}}}}});if(!row)throw new NotFoundException('SOURCE_NOT_FOUND');return this.public(row);}
 async channels(id:string,query:{page:number;pageSize:number;search?:string;group?:string}){
  await this.require(id);
  const page=Math.max(1,Math.floor(query.page));
  const pageSize=Math.min(150,Math.max(20,Math.floor(query.pageSize)));
  const search=query.search?.trim().slice(0,100);
  const group=query.group?.trim().slice(0,200);
  const base:Prisma.SourceCatalogItemWhereInput={sourceId:id,kind:'LIVE',active:true,channelId:{not:null}};
  const where:Prisma.SourceCatalogItemWhereInput={...base,...(group?{groupName:group}:{}),...(search?{OR:[{displayName:{contains:search,mode:'insensitive'}},{groupName:{contains:search,mode:'insensitive'}}]}:{})};
  const [items,total,groups]=await this.prisma.$transaction([
   this.prisma.sourceCatalogItem.findMany({where,select:{id:true,displayName:true,groupName:true,normalized:true,channel:{select:{id:true,slug:true,names:true,logoUrl:true,status:true,webAvailable:true,category:{select:{id:true,slug:true,names:true}}}}},orderBy:[{groupName:'asc'},{displayName:'asc'}],skip:(page-1)*pageSize,take:pageSize}),
   this.prisma.sourceCatalogItem.count({where}),
   this.prisma.sourceCatalogItem.groupBy({by:['groupName'],where:base,_count:{id:true},orderBy:{groupName:'asc'}})
  ]);
  return{items,total,page,pageSize,pages:Math.max(1,Math.ceil(total/pageSize)),groups:groups.map(value=>({name:value.groupName??'Sans catégorie',value:value.groupName??'',count:typeof value._count==='object'&&value._count?value._count.id??0:0}))};
 }
 async publishChannels(sourceId:string,dto:PublishSourceChannelsDto,actorId:string){if(!dto.rightsConfirmed)throw new BadRequestException('RIGHTS_CONFIRMATION_REQUIRED');await this.require(sourceId);if(dto.categoryId&&!await this.prisma.category.findUnique({where:{id:dto.categoryId}}))throw new BadRequestException('CATEGORY_NOT_FOUND');const items=await this.prisma.sourceCatalogItem.findMany({where:{sourceId,id:{in:dto.itemIds},kind:'LIVE',active:true,channelId:{not:null}},select:{id:true,channelId:true}});if(items.length!==dto.itemIds.length)throw new BadRequestException('SOURCE_CHANNEL_SELECTION_INVALID');const channelIds=items.map(item=>item.channelId!);const now=new Date(),validUntil=new Date(now);validUntil.setUTCFullYear(validUntil.getUTCFullYear()+1);await this.prisma.$transaction(async tx=>{await tx.channel.updateMany({where:{id:{in:channelIds}},data:{status:'PUBLISHED',webAvailable:true,publishedAt:now,archivedAt:null,...(dto.categoryId?{categoryId:dto.categoryId}:{})}});for(const channelId of channelIds)await tx.channelRight.upsert({where:{channelId_countryCode:{channelId,countryCode:dto.countryCode}},create:{channelId,countryCode:dto.countryCode,webAllowed:true,mobileAllowed:true,tvAllowed:true,validFrom:now,validUntil,approved:true,contractRef:'ADMIN_CONFIRMED'},update:{webAllowed:true,mobileAllowed:true,tvAllowed:true,validFrom:now,validUntil,approved:true,contractRef:'ADMIN_CONFIRMED'}});await tx.sourceAuditEvent.create({data:{sourceId,actorId,action:'CHANNELS_PUBLISHED',changes:{itemIds:dto.itemIds,channelIds,categoryId:dto.categoryId??null,countryCode:dto.countryCode}}});});return{published:channelIds.length,channelIds};}
 async create(dto:SourceAccountDto,actorId:string){this.validateType(dto);await this.validateUrls(dto);const encrypted=this.vault.encrypt(secrets(dto));const row=await this.prisma.sourceAccount.create({data:{...this.data(dto),owner:{connect:{id:actorId}},secret:{create:encrypted},auditEvents:{create:{actorId,action:'SOURCE_CREATED',changes:this.changes(dto)}}},include:{secret:true,testRuns:true}});return this.public(row);}
 async createUploadedM3u(name:string|undefined,content:string,actorId:string,options:{syncLive:boolean;syncMovies:boolean;syncSeries:boolean}){
  const cleanName=name?.trim();if(!cleanName||cleanName.length<2||cleanName.length>100)throw new BadRequestException('SOURCE_NAME_INVALID');
  const normalized=content.replace(/^\uFEFF/,'').trimStart();if(!normalized.startsWith('#EXTM3U'))throw new BadRequestException('M3U_HEADER_MISSING');
  if(!/^#EXTINF:/m.test(normalized))throw new BadRequestException('M3U_NO_ENTRIES');
  const urls=new Map<string,string>();for(const line of normalized.split(/\r?\n/)){const value=line.trim();if(!value||value.startsWith('#'))continue;let url:URL;try{url=new URL(value);}catch{throw new BadRequestException('M3U_STREAM_URL_INVALID');}if(!['http:','https:'].includes(url.protocol))throw new BadRequestException('M3U_STREAM_URL_INVALID');urls.set(url.hostname.toLowerCase(),value);}
  if(!urls.size)throw new BadRequestException('M3U_NO_STREAM_URLS');if(urls.size>2_000)throw new BadRequestException('M3U_TOO_MANY_STREAM_HOSTS');const streamHosts=[...urls.keys()];
  const encrypted=this.vault.encrypt({apiToken:normalized});
  const row=await this.prisma.sourceAccount.create({data:{name:cleanName,type:'M3U',baseUrl:'https://uploaded-m3u.invalid/file.m3u',allowedHosts:['uploaded-m3u.invalid',...streamHosts],...options,status:'READY',lastTestedAt:new Date(),lastSuccessAt:new Date(),owner:{connect:{id:actorId}},secret:{create:encrypted},auditEvents:{create:{actorId,action:'M3U_FILE_UPLOADED',changes:{fileSize:Buffer.byteLength(normalized),streamHosts,storage:'ENCRYPTED_DATABASE'}}}},include:{secret:true,testRuns:true}});
  return this.public(row);
 }
 async update(id:string,dto:SourceAccountDto,actorId:string){const current=await this.require(id);await this.validateUrls(dto);const previous=this.vault.decrypt(current.secret!);const supplied=secrets(dto);const merged=Object.fromEntries(Object.entries({...previous,...supplied}).filter(([,v])=>v!==undefined&&v!=='')) as SourceCredentials;this.validateCredentials(dto.type,merged);const encrypted=this.vault.encrypt(merged);await this.prisma.$transaction([this.prisma.sourceAccount.update({where:{id},data:{...this.data(dto),status:'DRAFT',enabled:false,lastErrorCode:null,secret:{upsert:{create:encrypted,update:encrypted}}}}),this.prisma.sourceAuditEvent.create({data:{sourceId:id,actorId,action:'SOURCE_UPDATED',changes:this.changes(dto)}})]);return this.get(id);}
 async test(id:string,actorId:string){const source=await this.require(id);await this.prisma.sourceAccount.update({where:{id},data:{status:'TESTING',enabled:false}});let result:ConnectorResult;try{result=await this.connectors.test(source,this.vault.decrypt(source.secret!));}catch{result={outcome:'UNREACHABLE',latencyMs:0,errorCode:'SOURCE_TEST_FAILED',detail:'SOURCE_TEST_FAILED'};}const status=this.status(result.outcome);const now=new Date();await this.prisma.$transaction([this.prisma.sourceTestRun.create({data:{sourceId:id,outcome:result.outcome,latencyMs:result.latencyMs,capabilities:result.capabilities as Prisma.InputJsonValue|undefined,errorCode:result.errorCode,detail:result.detail}}),this.prisma.sourceAccount.update({where:{id},data:{status,lastTestedAt:now,lastSuccessAt:result.outcome==='SUCCESS'?now:undefined,lastErrorCode:result.errorCode??null,lastLatencyMs:result.latencyMs,accountExpiresAt:result.expiresAt,maxConcurrentStreams:result.maxConnections??source.maxConcurrentStreams}}),this.prisma.sourceAuditEvent.create({data:{sourceId:id,actorId,action:'SOURCE_TESTED',changes:{outcome:result.outcome,latencyMs:result.latencyMs,errorCode:result.errorCode??null}}})]);return{...result,status};}
 async enable(id:string,actorId:string){const source=await this.require(id);if(source.status!=='READY'||!source.lastSuccessAt)throw new BadRequestException('SOURCE_SUCCESSFUL_TEST_REQUIRED');const value=await this.prisma.sourceAccount.update({where:{id},data:{enabled:true}});await this.audit(id,actorId,'SOURCE_ENABLED');return this.public({...value,secret:source.secret,testRuns:[]});}
 async disable(id:string,actorId:string){const source=await this.require(id);const value=await this.prisma.sourceAccount.update({where:{id},data:{enabled:false,status:'DISABLED'}});await this.audit(id,actorId,'SOURCE_DISABLED');return this.public({...value,secret:source.secret,testRuns:[]});}
 async remove(id:string,actorId:string){
  const source=await this.require(id);
  const links=await this.prisma.sourceCatalogItem.findMany({where:{sourceId:id},select:{channelId:true,mediaTitleId:true,episodeId:true}});
  const linkedChannelIds=[...new Set(links.map(link=>link.channelId).filter((value):value is string=>!!value))];
  const linkedMediaTitleIds=[...new Set(links.map(link=>link.mediaTitleId).filter((value):value is string=>!!value))];
  const linkedEpisodeIds=[...new Set(links.map(link=>link.episodeId).filter((value):value is string=>!!value))];
  // Imported catalogue entities can theoretically be linked to another source.
  // Only hard-delete entities owned exclusively by the source being removed.
  const shared=await this.prisma.sourceCatalogItem.findMany({where:{sourceId:{not:id},OR:[{channelId:{in:linkedChannelIds}},{mediaTitleId:{in:linkedMediaTitleIds}},{episodeId:{in:linkedEpisodeIds}}]},select:{channelId:true,mediaTitleId:true,episodeId:true}});
  const sharedChannels=new Set(shared.map(link=>link.channelId).filter(Boolean));
  const sharedMedia=new Set(shared.map(link=>link.mediaTitleId).filter(Boolean));
  const sharedEpisodes=new Set(shared.map(link=>link.episodeId).filter(Boolean));
  const channelIds=linkedChannelIds.filter(value=>!sharedChannels.has(value));
  const mediaTitleIds=linkedMediaTitleIds.filter(value=>!sharedMedia.has(value));
  const episodeIds=linkedEpisodeIds.filter(value=>!sharedEpisodes.has(value));
  const categories=channelIds.length?await this.prisma.channel.findMany({where:{id:{in:channelIds}},select:{categoryId:true}}):[];
  const categoryIds=[...new Set(categories.map(value=>value.categoryId))];
  await this.prisma.$transaction(async tx=>{
   const variants=await tx.playbackVariant.findMany({where:{OR:[{channelId:{in:channelIds}},{mediaTitleId:{in:mediaTitleIds}},{episodeId:{in:episodeIds}}]},select:{id:true}});
   const variantIds=variants.map(value=>value.id);
   if(variantIds.length)await tx.playbackSession.deleteMany({where:{variantId:{in:variantIds}}});
   if(channelIds.length){await tx.packageChannel.deleteMany({where:{channelId:{in:channelIds}}});await tx.channel.deleteMany({where:{id:{in:channelIds}}});}
   if(mediaTitleIds.length)await tx.mediaTitle.deleteMany({where:{id:{in:mediaTitleIds}}});
   if(episodeIds.length)await tx.episode.deleteMany({where:{id:{in:episodeIds}}});
   await tx.channelAvailability.deleteMany({where:{sourceId:id}});
   await tx.contentAuditEvent.deleteMany({where:{entityId:{in:[id,...channelIds,...mediaTitleIds,...episodeIds]}}});
   await tx.sourceAccount.delete({where:{id}});
   for(const categoryId of categoryIds)if(!await tx.channel.count({where:{categoryId}}))await tx.category.delete({where:{id:categoryId}});
  });
  void actorId;
  return{deleted:true,id,name:source.name,channelsDeleted:channelIds.length,mediaDeleted:mediaTitleIds.length,episodesDeleted:episodeIds.length,sharedItemsPreserved:linkedChannelIds.length-channelIds.length+linkedMediaTitleIds.length-mediaTitleIds.length+linkedEpisodeIds.length-episodeIds.length,fileDeleted:source.baseUrl.includes('uploaded-m3u.invalid')};
 }
 private async require(id:string){const value=await this.prisma.sourceAccount.findUnique({where:{id},include:{secret:true}});if(!value||!value.secret)throw new NotFoundException('SOURCE_NOT_FOUND');return value;}
 private data(dto:SourceAccountDto){return{name:dto.name,type:dto.type,baseUrl:this.normalize(dto.baseUrl),regionCode:dto.regionCode,priority:dto.priority??100,syncLive:dto.syncLive??true,syncMovies:dto.syncMovies??true,syncSeries:dto.syncSeries??true,syncEpg:dto.syncEpg??false,userAgent:dto.userAgent,epgUrl:dto.epgUrl?this.normalize(dto.epgUrl):null,refreshIntervalMin:dto.refreshIntervalMin??360,maxConcurrentStreams:dto.maxConcurrentStreams,preferHls:dto.preferHls??true,allowedHosts:dto.allowedHosts.map(v=>v.toLowerCase())};}
 private async validateUrls(dto:SourceAccountDto){await this.policy.validate(dto.baseUrl,dto.allowedHosts);if(dto.epgUrl)await this.policy.validate(dto.epgUrl,dto.allowedHosts);}
 private validateType(dto:SourceAccountDto){if(dto.type==='XTREAM'&&(!dto.username||!dto.password))throw new BadRequestException('XTREAM_CREDENTIALS_REQUIRED');if(dto.type==='PORTAL_MAC'&&!dto.macAddress)throw new BadRequestException('PORTAL_MAC_REQUIRED');if(!dto.allowedHosts.length)throw new BadRequestException('ALLOWED_HOST_REQUIRED');}
 private validateCredentials(type:SourceAccountDto['type'],credentials:SourceCredentials){if(type==='XTREAM'&&(!credentials.username||!credentials.password))throw new BadRequestException('XTREAM_CREDENTIALS_REQUIRED');if(type==='PORTAL_MAC'&&!credentials.macAddress)throw new BadRequestException('PORTAL_MAC_REQUIRED');}
 private normalize(raw:string){const url=new URL(raw);url.hash='';return url.toString();}
 private status(outcome:SourceTestOutcome):SourceStatus{return outcome==='SUCCESS'?'READY':outcome==='AUTH_FAILED'?'AUTH_FAILED':outcome==='EXPIRED'?'EXPIRED':outcome==='UNREACHABLE'?'OFFLINE':'DEGRADED';}
 private changes(dto:SourceAccountDto){return{name:dto.name,type:dto.type,baseUrlHost:new URL(dto.baseUrl).host,regionCode:dto.regionCode??null,allowedHosts:dto.allowedHosts,secretFields:Object.keys(secrets(dto)).filter(k=>Boolean(secrets(dto)[k as keyof SourceCredentials]))};}
 private audit(sourceId:string,actorId:string,action:string){return this.prisma.sourceAuditEvent.create({data:{sourceId,actorId,action}});}
 private public(row:{secret?:{ciphertext:string;iv:string;authTag:string;keyVersion:number}|null;[key:string]:unknown}){const{secret,...safe}=row;return{...safe,secretFlags:secret?this.vault.flags(this.vault.decrypt(secret)):this.vault.flags({})};}
}
