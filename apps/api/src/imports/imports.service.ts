import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy,OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImportChangeType, ImportedItemKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SourceVaultService } from '../sources/source-vault.service';
import { ImportRuleDto, SelectionDto, StartImportDto } from './import.dto';
import { ImportReaderService } from './import-reader.service';
import { NormalizedSourceItem, normalize } from './m3u-parser';
import { createHash, randomUUID } from 'node:crypto';

@Injectable()
export class ImportsService implements OnModuleInit,OnModuleDestroy {
  private readonly running = new Set<string>();
  private readonly workerId = `${process.pid}-${randomUUID()}`;
  private timer?:NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService, private readonly vault: SourceVaultService, private readonly reader: ImportReaderService,private readonly config:ConfigService) {}
  async onModuleInit() {
    if(this.mode()==='enqueue')return;
    const interrupted=await this.prisma.importJob.findMany({where:{status:{in:['QUEUED','CONNECTING','DOWNLOADING','PARSING','STAGING','APPLYING']},OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lt:new Date()}}]},orderBy:{createdAt:'asc'},take:2,select:{id:true,sourceId:true,status:true,createdAt:true}});
    for(const job of interrupted){
      if(job.status==='APPLYING')setImmediate(()=>void this.executeApply(job.id,job.sourceId,job.createdAt));
      else{
        await this.prisma.importJob.update({where:{id:job.id},data:{status:'QUEUED',errorCode:null,errorDetail:null,workerId:null,leaseExpiresAt:null,finishedAt:null}});
        setImmediate(()=>void this.execute(job.id));
      }
    }
    const completed = await this.prisma.importJob.findMany({ where: { status: 'COMPLETED' }, distinct: ['sourceId'], orderBy: { createdAt: 'desc' }, select: { sourceId: true, createdAt: true } });
    for (const job of completed) await this.prisma.importJob.updateMany({ where: { sourceId: job.sourceId, status: 'PREVIEW', createdAt: { lt: job.createdAt } }, data: { status: 'CANCELLED', errorCode: 'IMPORT_SUPERSEDED', errorDetail: 'IMPORT_SUPERSEDED', finishedAt: new Date() } });
    // A temporary database/network outage must not crash the API process. The next tick retries.
    this.timer=setInterval(()=>void this.dispatchAvailable().catch(()=>undefined),5_000);this.timer.unref();
  }
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  list(sourceId?: string) { return this.prisma.importJob.findMany({ where: sourceId ? { sourceId } : undefined, include: { source: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async get(id: string, includeItems = true) { const job = await this.prisma.importJob.findUnique({ where: { id }, include: { source: { select: { id: true, name: true, type: true } }, stagedItems: includeItems ? { orderBy: [{ changeType: 'asc' }, { displayName: 'asc' }] } : false } }); if (!job) throw new NotFoundException('IMPORT_NOT_FOUND'); return job; }
  async start(sourceId: string, dto: StartImportDto) {
    const source = await this.prisma.sourceAccount.findUnique({ where: { id: sourceId } }); if (!source) throw new NotFoundException('SOURCE_NOT_FOUND'); if (!source.enabled || source.status !== 'READY') throw new BadRequestException('SOURCE_MUST_BE_READY_AND_ENABLED');
    const current = await this.prisma.importJob.findFirst({ where: { sourceId, status: { in: ['QUEUED', 'CONNECTING', 'DOWNLOADING', 'PARSING', 'STAGING', 'PREVIEW', 'APPLYING'] } }, orderBy: { createdAt: 'desc' } });
    if (current) {
      if (current.status === 'APPLYING'&&this.mode()!=='enqueue') setImmediate(() => void this.executeApply(current.id, current.sourceId, current.createdAt));
      else if (current.status !== 'PREVIEW' && !this.running.has(current.id) && (!current.leaseExpiresAt||current.leaseExpiresAt<new Date())) {
        await this.prisma.importJob.update({where:{id:current.id},data:{status:'QUEUED',cancelRequested:false,errorCode:null,errorDetail:null,workerId:null,leaseExpiresAt:null,finishedAt:null}});
        if(this.mode()!=='enqueue')setImmediate(() => void this.execute(current.id));
        return this.get(current.id,false);
      }
      return current;
    }
    const job = await this.prisma.importJob.create({ data: { sourceId, scope: dto.scope.length ? dto.scope : this.defaultScope(source) } }); if(this.mode()!=='enqueue')setImmediate(() => void this.execute(job.id)); return job;
  }
  private async execute(jobId:string){if(this.running.has(jobId)||!await this.claim(jobId))return;this.running.add(jobId);try{await this.run(jobId);}finally{this.running.delete(jobId);}}
  async run(jobId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId }, include: { source: { include: { secret: true, importRules: true } } } }); if (!job?.source.secret) return;
    try {
      await this.state(jobId, 'CONNECTING', 5, { startedAt: new Date() }); if (await this.cancelled(jobId)) return this.cancel(jobId);
      const scopedSource = {
        ...job.source,
        syncLive: job.source.syncLive && job.scope.includes('LIVE'),
        syncMovies: job.source.syncMovies && job.scope.includes('MOVIE'),
        syncSeries: job.source.syncSeries && job.scope.includes('SERIES'),
        syncEpg: job.source.syncEpg && job.scope.includes('EPG'),
      };
      await this.state(jobId, 'DOWNLOADING', 15);
      let received=0,stagedCount=0,lastProgress=14,providerTotal=0;const streamHosts=new Set(job.source.allowedHosts.map(value=>value.toLowerCase()));
      const progress=async(current:number,total:number)=>{received=Math.max(received,current);providerTotal=Math.max(providerTotal,total);const percent=total>0?15+Math.floor(65*Math.min(1,current/total)):Math.min(79,15+Math.floor(Math.log10(current+1)*12));if(percent>lastProgress){lastProgress=percent;await this.prisma.importJob.update({where:{id:jobId},data:{progress:percent,totalItems:Math.max(current,total),processedItems:current,heartbeatAt:new Date(),leaseExpiresAt:new Date(Date.now()+120_000),checkpoint:{received:current,total,phase:'download'}}});}};
      for await(const batch of this.reader.batches(scopedSource,this.vault.decrypt(job.source.secret),job.scope,progress)){
        if(await this.cancelled(jobId))return this.cancel(jobId);stagedCount+=batch.length;received=Math.max(received,stagedCount);
        for(const item of batch)if(item.streamRef?.startsWith('http://')||item.streamRef?.startsWith('https://'))try{streamHosts.add(new URL(item.streamRef).hostname.toLowerCase())}catch{/* malformed stream remains quarantined */}
        if(streamHosts.size>2_000)throw new BadRequestException('M3U_TOO_MANY_STREAM_HOSTS');
        const ids=[...new Set(batch.map(item=>item.remoteId))],kinds=[...new Set(batch.map(item=>item.kind))];
        const existing=await this.prisma.sourceCatalogItem.findMany({where:{sourceId:job.sourceId,kind:{in:kinds},remoteId:{in:ids}}});const previous=new Map(existing.map(item=>[`${item.kind}:${item.remoteId}`,item]));const conflictTargets=await this.conflictTargets(batch.map(item=>item.fingerprint));
        const rows:Prisma.ImportStagedItemCreateManyInput[]=batch.map(item=>{const old=previous.get(`${item.kind}:${item.remoteId}`),excluded=this.excluded(item,job.source.importRules),targets=conflictTargets.get(item.fingerprint),current=old?.mediaTitleId??old?.channelId,conflict=!!targets&&(targets.size>1||(targets.size===1&&!!current&&!targets.has(current))),changeType:ImportChangeType=excluded?'EXCLUDED':conflict?'CONFLICT':!old?'ADD':old.fingerprint===item.fingerprint?'UNCHANGED':'UPDATE',encrypted=item.streamRef?this.vault.encrypt({apiToken:item.streamRef}):undefined;return{jobId,kind:item.kind,remoteId:item.remoteId,fingerprint:item.fingerprint,groupName:item.groupName,displayName:item.displayName,normalized:this.normalized(item),raw:this.raw(item),changeType,selected:!excluded&&!conflict,reason:excluded?'IMPORT_RULE_EXCLUDED':conflict?'CANONICAL_MATCH_CONFLICT':null,streamCiphertext:encrypted?.ciphertext,streamIv:encrypted?.iv,streamAuthTag:encrypted?.authTag};});
        await this.prisma.importStagedItem.createMany({data:rows,skipDuplicates:true});await progress(received,providerTotal);
      }
      if(streamHosts.size!==job.source.allowedHosts.length)await this.prisma.sourceAccount.update({where:{id:job.sourceId},data:{allowedHosts:[...streamHosts]}});
      await this.state(jobId,'STAGING',90,{totalItems:received,processedItems:received,checkpoint:{received,total:providerTotal,phase:'staged'}});
      const grouped=await this.prisma.importStagedItem.groupBy({by:['changeType'],where:{jobId},_count:{_all:true}}),counts={add:0,update:0,unchanged:0,remove:0,excluded:0,conflict:0};for(const row of grouped)counts[row.changeType.toLowerCase() as keyof typeof counts]=row._count._all;
      await this.prisma.importJob.update({ where: { id: jobId }, data: { status: 'PREVIEW', progress: 100, totalItems: received, addedItems: counts.add, updatedItems: counts.update, unchangedItems: counts.unchanged, removedItems: 0, excludedItems: counts.excluded, conflictItems: counts.conflict,heartbeatAt:new Date(),leaseExpiresAt:null,workerId:null,checkpoint:{received,total:providerTotal,phase:'preview'} } });
    } catch (error) { await this.prisma.importJob.update({ where: { id: jobId }, data: { status: 'FAILED', errorCode: this.error(error), errorDetail: this.error(error),workerId:null,leaseExpiresAt:null, finishedAt: new Date() } }).catch(() => undefined); }
  }
  async selection(id: string, dto: SelectionDto) { await this.requirePreview(id); await this.prisma.$transaction([this.prisma.importStagedItem.updateMany({ where: { jobId: id }, data: { selected: false } }), this.prisma.importStagedItem.updateMany({ where: { jobId: id, id: { in: dto.selectedIds }, changeType: { notIn: ['CONFLICT', 'EXCLUDED'] } }, data: { selected: true } })]); return this.get(id); }
  async apply(id: string) {
    await this.requirePreview(id); const job = await this.prisma.importJob.update({ where: { id }, data: { status: 'APPLYING', progress: 0 } });
    if(this.mode()!=='enqueue')setImmediate(() => void this.executeApply(id, job.sourceId, job.createdAt)); return this.get(id, false);
  }
  private async executeApply(id:string,sourceId:string,createdAt:Date){if(this.running.has(id)||!await this.claim(id))return;this.running.add(id);try{const job=await this.prisma.importJob.findUnique({where:{id},select:{status:true}});if(job?.status==='PREVIEW')await this.prisma.importJob.update({where:{id},data:{status:'APPLYING',progress:0}});await this.runApply(id,sourceId,createdAt);}finally{this.running.delete(id);}}
  private async runApply(id: string, sourceId: string, createdAt: Date) {
    try {const where={jobId:id,selected:true,changeType:{notIn:['CONFLICT','EXCLUDED','UNCHANGED'] as ImportChangeType[]}},total=await this.prisma.importStagedItem.count({where});let done=0,cursor:string|undefined,lastProgress=-1;while(true){if(await this.cancelled(id)){await this.cancel(id);return;}const page=await this.prisma.importStagedItem.findMany({where,orderBy:{id:'asc'},take:500,...(cursor?{cursor:{id:cursor},skip:1}:{})});if(!page.length)break;const liveAdds=page.filter(item=>item.kind==='LIVE'&&item.changeType==='ADD');if(liveAdds.length)await this.bulkAddLive(sourceId,liveAdds);const remaining=page.filter(item=>!(item.kind==='LIVE'&&item.changeType==='ADD'));for(let at=0;at<remaining.length;at+=20)await Promise.all(remaining.slice(at,at+20).map(item=>item.changeType==='REMOVE'?this.prisma.sourceCatalogItem.updateMany({where:{sourceId,kind:item.kind,remoteId:item.remoteId},data:{active:false}}):this.applyItem(sourceId,{...item,normalized:item.normalized as Prisma.InputJsonValue})));done+=page.length;cursor=page.at(-1)!.id;const progress=Math.min(99,Math.floor(done/Math.max(total,1)*100));if(progress>=lastProgress+2){lastProgress=progress;await this.state(id,'APPLYING',progress,{processedItems:done,checkpoint:{cursor,received:done,total,phase:'apply'}});}} await this.prisma.importJob.update({ where: { id }, data: { status: 'COMPLETED', progress: 100,processedItems:done,heartbeatAt:new Date(),leaseExpiresAt:null,workerId:null,checkpoint:{received:done,total,phase:'complete'}, finishedAt: new Date() } }); await this.prisma.importJob.updateMany({where:{sourceId,id:{not:id},createdAt:{lt:createdAt},status:'PREVIEW'},data:{status:'CANCELLED',errorCode:'IMPORT_SUPERSEDED',errorDetail:'IMPORT_SUPERSEDED',finishedAt:new Date()}});await this.prisma.importJob.updateMany({where:{sourceId,id:{not:id},createdAt:{lt:createdAt},status:'APPLYING'},data:{cancelRequested:true}}); }
    catch (error) { await this.prisma.importJob.update({ where: { id }, data: { status: 'PARTIAL', errorCode: this.error(error), errorDetail: this.error(error),workerId:null,leaseExpiresAt:null, finishedAt: new Date() } }); }
  }
  async requestCancel(id: string) { const job = await this.prisma.importJob.findUnique({ where: { id } }); if (!job) throw new NotFoundException('IMPORT_NOT_FOUND'); return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status) ? job : this.prisma.importJob.update({ where: { id }, data: { cancelRequested: true } }); }
  rules(sourceId: string) { return this.prisma.sourceImportRule.findMany({ where: { sourceId }, orderBy: { createdAt: 'asc' } }); } createRule(sourceId: string, dto: ImportRuleDto) { return this.prisma.sourceImportRule.create({ data: { sourceId, ...dto, exclude: dto.exclude ?? true } }); } deleteRule(id: string) { return this.prisma.sourceImportRule.delete({ where: { id } }); }
  private async bulkAddLive(sourceId:string,items:{remoteId:string;fingerprint:string;groupName:string|null;displayName:string;normalized:Prisma.JsonValue;streamCiphertext:string|null;streamIv:string|null;streamAuthTag:string|null}[]){
    const existing=new Set<string>();
    for(let at=0;at<items.length;at+=1_000){const rows=await this.prisma.sourceCatalogItem.findMany({where:{sourceId,kind:'LIVE',remoteId:{in:items.slice(at,at+1_000).map(item=>item.remoteId)}},select:{remoteId:true}});for(const row of rows)existing.add(row.remoteId);}
    const pending=items.filter(item=>!existing.has(item.remoteId));if(!pending.length)return;
    const groupSlugs=new Map<string,string>();for(const item of pending){const group=item.groupName||'Import';groupSlugs.set(group,this.categorySlug(sourceId,group));}
    await this.prisma.category.createMany({data:[...groupSlugs].map(([group,slug])=>({slug,names:{fr:group,en:group,ar:group} as Prisma.InputJsonValue})),skipDuplicates:true});
    const categories=await this.prisma.category.findMany({where:{slug:{in:[...groupSlugs.values()]}},select:{id:true,slug:true}}),categoryIds=new Map(categories.map(category=>[category.slug,category.id]));
    for(let at=0;at<pending.length;at+=500){
      const batch=pending.slice(at,at+500),now=new Date(),prepared=batch.map(item=>{const metadata=item.normalized as Record<string,unknown>,group=item.groupName||'Import',channelId=randomUUID(),suffix=createHash('sha256').update(`${sourceId}:${item.remoteId}`).digest('hex').slice(0,14);return{item,channelId,slug:`${this.slug(item.displayName).slice(0,48)}-${suffix}`,categoryId:categoryIds.get(groupSlugs.get(group)!)!,logoUrl:typeof metadata.logoUrl==='string'&&metadata.logoUrl?metadata.logoUrl:null,languageCode:typeof metadata.languageCode==='string'&&metadata.languageCode?metadata.languageCode:'und'};});
      await this.prisma.$transaction([
        this.prisma.channel.createMany({data:prepared.map(value=>({id:value.channelId,slug:value.slug,names:{fr:value.item.displayName,en:value.item.displayName,ar:value.item.displayName},searchText:value.item.displayName,logoUrl:value.logoUrl,languageCode:value.languageCode,countryCode:'ALL',categoryId:value.categoryId,status:'DRAFT',webAvailable:false})),skipDuplicates:true}),
        this.prisma.playbackVariant.createMany({data:prepared.map(value=>({channelId:value.channelId,label:'Source importée',protocol:'REMOTE_REFERENCE',reference:`source-item:${sourceId}:LIVE:${value.item.remoteId}`,regionCodes:['ALL']})),skipDuplicates:true}),
        this.prisma.sourceCatalogItem.createMany({data:prepared.map(value=>({sourceId,kind:'LIVE',remoteId:value.item.remoteId,fingerprint:value.item.fingerprint,groupName:value.item.groupName,displayName:value.item.displayName,normalized:value.item.normalized as Prisma.InputJsonValue,active:true,lastSeenAt:now,channelId:value.channelId,streamCiphertext:value.item.streamCiphertext,streamIv:value.item.streamIv,streamAuthTag:value.item.streamAuthTag})),skipDuplicates:true}),
      ]);
    }
  }
  private async applyItem(sourceId: string, item: { kind: ImportedItemKind; remoteId: string; fingerprint: string; groupName: string | null; displayName: string; normalized: Prisma.InputJsonValue; streamCiphertext: string | null; streamIv: string | null; streamAuthTag: string | null }) {
    const existing = await this.prisma.sourceCatalogItem.findUnique({ where: { sourceId_kind_remoteId: { sourceId, kind: item.kind, remoteId: item.remoteId } } }); let channelId = existing?.channelId, mediaTitleId = existing?.mediaTitleId;
    if (!channelId && !mediaTitleId && item.kind === 'LIVE') channelId = await this.createChannel(sourceId, item); if (!channelId && !mediaTitleId && ['MOVIE', 'SERIES'].includes(item.kind)) mediaTitleId = await this.createMedia(sourceId, item);
    const metadata=item.normalized as Record<string,unknown>,logoUrl=typeof metadata.logoUrl==='string'&&metadata.logoUrl?metadata.logoUrl:null;
    if(channelId)await this.prisma.channel.update({where:{id:channelId},data:{names:{fr:item.displayName,en:item.displayName,ar:item.displayName},searchText:item.displayName,...(logoUrl?{logoUrl}:{})}});
    if(mediaTitleId){await this.prisma.mediaTitle.update({where:{id:mediaTitleId},data:{names:{fr:item.displayName,en:item.displayName,ar:item.displayName},searchText:item.displayName}});if(logoUrl&&!await this.prisma.mediaImage.count({where:{mediaTitleId,type:'POSTER'}}))await this.prisma.mediaImage.create({data:{mediaTitleId,type:'POSTER',url:logoUrl,sortOrder:0}});}
    const common = { fingerprint: item.fingerprint, groupName: item.groupName, displayName: item.displayName, normalized: item.normalized, active: true, lastSeenAt: new Date(), streamCiphertext: item.streamCiphertext, streamIv: item.streamIv, streamAuthTag: item.streamAuthTag };
    await this.prisma.sourceCatalogItem.upsert({ where: { sourceId_kind_remoteId: { sourceId, kind: item.kind, remoteId: item.remoteId } }, create: { sourceId, kind: item.kind, remoteId: item.remoteId, ...common, channelId, mediaTitleId }, update: common });
  }
  private async createChannel(sourceId: string, item: { remoteId: string; displayName: string; groupName: string | null; normalized:Prisma.InputJsonValue }) { const group = item.groupName || 'Import',metadata=item.normalized as Record<string,unknown>,logoUrl=typeof metadata.logoUrl==='string'&&metadata.logoUrl?metadata.logoUrl:undefined, categorySlug = this.slug(`src-${sourceId.slice(-6)}-${group}`); const category = await this.prisma.category.upsert({ where: { slug: categorySlug }, create: { slug: categorySlug, names: { fr: group, en: group, ar: group } }, update: { active: true } }); const slug = await this.uniqueSlug(this.slug(`${item.displayName}-${sourceId.slice(-6)}-${item.remoteId}`), 'channel'); const channel = await this.prisma.channel.create({ data: { slug, names: { fr: item.displayName, en: item.displayName, ar: item.displayName }, searchText: item.displayName,logoUrl, languageCode: 'und', countryCode: 'ALL', categoryId: category.id, status: 'DRAFT', webAvailable: false } }); await this.prisma.playbackVariant.create({ data: { channelId: channel.id, label: 'Source importée', protocol: 'REMOTE_REFERENCE', reference: `source-item:${sourceId}:LIVE:${item.remoteId}`, regionCodes: ['ALL'] } }); return channel.id; }
  private async createMedia(sourceId: string, item: { kind: ImportedItemKind; remoteId: string; displayName: string; normalized: Prisma.InputJsonValue }) { const metadata = item.normalized as Record<string, unknown>,logoUrl=typeof metadata.logoUrl==='string'&&metadata.logoUrl?metadata.logoUrl:undefined, slug = await this.uniqueSlug(this.slug(item.displayName), 'media'); const media = await this.prisma.mediaTitle.create({ data: { slug, type: item.kind === 'MOVIE' ? 'MOVIE' : 'SERIES', names: { fr: item.displayName, en: item.displayName, ar: item.displayName }, searchText: item.displayName, countryCodes: [], status: 'DRAFT', releaseYear: typeof metadata.year === 'number' ? metadata.year : undefined,...(logoUrl?{images:{create:{type:'POSTER',url:logoUrl,sortOrder:0}}}:{}), ...(item.kind === 'MOVIE' ? { movie: { create: { durationSec: 1 } } } : { series: { create: {} } }) } }); await this.prisma.playbackVariant.create({ data: { mediaTitleId: media.id, label: 'Source importée', protocol: 'REMOTE_REFERENCE', reference: `source-item:${sourceId}:${item.kind}:${item.remoteId}`, regionCodes: ['ALL'] } }); return media.id; }
  private normalized(item: NormalizedSourceItem) { const safe = { ...item }; delete safe.streamRef; delete safe.raw; return safe as unknown as Prisma.InputJsonValue; } private raw(item: NormalizedSourceItem): Prisma.InputJsonValue | typeof Prisma.JsonNull { return item.raw ? item.raw as Prisma.InputJsonValue : Prisma.JsonNull; }
  private excluded(item: NormalizedSourceItem, rules: { field: string; pattern: string; exclude: boolean }[]) { return rules.some(rule => rule.exclude && String(item[rule.field as keyof NormalizedSourceItem] ?? '').toLowerCase().includes(rule.pattern.toLowerCase())); }
  private categorySlug(sourceId:string,group:string){const suffix=createHash('sha256').update(group).digest('hex').slice(0,10);return `${this.slug(group).slice(0,45)}-${sourceId.slice(-6)}-${suffix}`;}
  private async conflictTargets(fingerprints:string[]){const result=new Map<string,Set<string>>(),unique=[...new Set(fingerprints)];for(let at=0;at<unique.length;at+=1_000){const rows=await this.prisma.sourceCatalogItem.findMany({where:{fingerprint:{in:unique.slice(at,at+1_000)},active:true},select:{fingerprint:true,channelId:true,mediaTitleId:true}});for(const row of rows){const target=row.channelId??row.mediaTitleId;if(!target)continue;const targets=result.get(row.fingerprint)??new Set<string>();targets.add(target);result.set(row.fingerprint,targets);}}return result;}
  private counts(rows: { changeType: ImportChangeType }[]) { const out = { add: 0, update: 0, unchanged: 0, remove: 0, excluded: 0, conflict: 0 }; for (const row of rows) out[row.changeType.toLowerCase() as keyof typeof out]++; return out; }
  private async registerStreamHosts(sourceId:string,current:string[],items:NormalizedSourceItem[]){const hosts=new Set(current.map(value=>value.toLowerCase()));for(const item of items){if(!item.streamRef?.startsWith('http://')&&!item.streamRef?.startsWith('https://'))continue;try{hosts.add(new URL(item.streamRef).hostname.toLowerCase())}catch{/* Invalid entries remain unavailable without failing the whole playlist. */}}if(hosts.size>2_000)throw new BadRequestException('M3U_TOO_MANY_STREAM_HOSTS');if(hosts.size!==current.length)await this.prisma.sourceAccount.update({where:{id:sourceId},data:{allowedHosts:[...hosts]}});}
  private defaultScope(source: { syncLive: boolean; syncMovies: boolean; syncSeries: boolean; syncEpg: boolean }) { return [source.syncLive && 'LIVE', source.syncMovies && 'MOVIE', source.syncSeries && 'SERIES', source.syncEpg && 'EPG'].filter(Boolean) as ImportedItemKind[]; }
  private async claim(id:string){const result=await this.prisma.importJob.updateMany({where:{id,OR:[{workerId:this.workerId},{workerId:null},{leaseExpiresAt:{lt:new Date()}}]},data:{workerId:this.workerId,heartbeatAt:new Date(),leaseExpiresAt:new Date(Date.now()+120_000)}});return result.count===1;}
  private mode(){return this.config.get<'all'|'enqueue'|'worker'>('IMPORT_EXECUTION_MODE')??'all';}
  private async dispatchAvailable(){const jobs=await this.prisma.importJob.findMany({where:{status:{in:['QUEUED','CONNECTING','DOWNLOADING','PARSING','STAGING','APPLYING']},OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lt:new Date()}}]},orderBy:{createdAt:'asc'},take:2,select:{id:true,sourceId:true,status:true,createdAt:true}});for(const job of jobs)if(job.status==='APPLYING')void this.executeApply(job.id,job.sourceId,job.createdAt);else void this.execute(job.id);}
  private state(id: string, status: 'CONNECTING' | 'DOWNLOADING' | 'PARSING' | 'STAGING' | 'APPLYING', progress: number, extra: Prisma.ImportJobUpdateInput = {}) { return this.prisma.importJob.update({ where: { id }, data: { status, progress,workerId:this.workerId,heartbeatAt:new Date(),leaseExpiresAt:new Date(Date.now()+120_000), ...extra } }); } private async cancelled(id: string) { return (await this.prisma.importJob.findUnique({ where: { id }, select: { cancelRequested: true } }))?.cancelRequested ?? true; } private cancel(id: string) { return this.prisma.importJob.update({ where: { id }, data: { status: 'CANCELLED',workerId:null,leaseExpiresAt:null, finishedAt: new Date() } }); }
  private async requirePreview(id: string) { const job = await this.prisma.importJob.findUnique({ where: { id } }); if (!job) throw new NotFoundException('IMPORT_NOT_FOUND'); if (job.status !== 'PREVIEW') throw new BadRequestException('IMPORT_PREVIEW_REQUIRED'); return job; } private error(value: unknown) { return (value instanceof Error ? value.message : 'IMPORT_FAILED').replace(/https?:\/\/\S+/g, '[REDACTED_URL]').slice(0, 200); } private slug(value: string) { return normalize(value).replace(/ /g, '-').slice(0, 80) || 'item'; }
  private async uniqueSlug(base: string, type: 'channel' | 'media') { let slug = base; for (let i = 1; i < 1000; i++) { const found = type === 'channel' ? await this.prisma.channel.findUnique({ where: { slug }, select: { id: true } }) : await this.prisma.mediaTitle.findUnique({ where: { slug }, select: { id: true } }); if (!found) return slug; slug = `${base}-${i + 1}`; } return `${base}-${Date.now()}`; }
}
