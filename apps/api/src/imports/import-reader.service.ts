import { Injectable } from '@nestjs/common';
import { ImportedItemKind, SourceAccount } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PortalClient } from '../sources/portal-client';
import { SourceCredentials } from '../sources/source-vault.service';
import { UrlPolicyService } from '../sources/url-policy.service';
import { providerGenres } from './content-classifier';
import { normalize, NormalizedSourceItem, parseM3u, responseLines } from './m3u-parser';

@Injectable()
export class ImportReaderService {
 constructor(private readonly policy: UrlPolicyService) {}

 async read(source: SourceAccount, secret: SourceCredentials, onProgress?: (received:number,total:number)=>void|Promise<void>) { const output:NormalizedSourceItem[]=[]; for await(const batch of this.batches(source,secret,undefined,onProgress))output.push(...batch); return output; }

 async *batches(source:SourceAccount,secret:SourceCredentials,scope?:ImportedItemKind[],onProgress?:(received:number,total:number)=>void|Promise<void>):AsyncGenerator<NormalizedSourceItem[]> {
  const allowed=(item:NormalizedSourceItem)=>!scope?.length||scope.includes(item.kind);
  if(source.type==='PORTAL_MAC'){for await(const batch of new PortalClient(this.policy).catalogueBatches(source,secret,onProgress)){const filtered=batch.filter(allowed);if(filtered.length)yield filtered;}return;}
  if(source.type==='M3U'){const lines=source.baseUrl.includes('uploaded-m3u.invalid')?this.textLines(secret.apiToken??''):responseLines(await this.fetch(source,new URL(source.baseUrl)),1_000_000_000);let batch:NormalizedSourceItem[]=[];let received=0;for await(const item of parseM3u(lines)){if(!allowed(item))continue;batch.push(item);received++;if(batch.length>=500){yield batch;batch=[];await onProgress?.(received,0);}}if(batch.length)yield batch;await onProgress?.(received,received);return;}
  if(source.type==='XTREAM'){for await(const items of this.xtreamBatches(source,secret,onProgress)){const filtered=items.filter(allowed);if(filtered.length)yield filtered;}return;}
  if(source.type==='DIRECT'){const item=this.direct(source);if(allowed(item))yield[item];return;}
  throw new Error('SOURCE_TYPE_UNSUPPORTED');
 }

 private async fetch(source:SourceAccount,url:URL){for(let i=0;i<4;i++){await this.policy.validate(url.toString(),source.allowedHosts);const response=await globalThis.fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30_000),headers:{'user-agent':source.userAgent??'Streamly-Importer/1.0'}});if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw new Error('SOURCE_REDIRECT_INVALID');url=new URL(location,url);continue;}if(!response.ok)throw new Error(`SOURCE_HTTP_${response.status}`);return response;}throw new Error('SOURCE_TOO_MANY_REDIRECTS');}
 private async *textLines(content:string):AsyncGenerator<string>{for(const line of content.split(/\r?\n/))yield line;}

 private async *xtreamBatches(source:SourceAccount,secret:SourceCredentials,onProgress?:(received:number,total:number)=>void|Promise<void>){
  if(!secret.username||!secret.password)throw new Error('XTREAM_CREDENTIALS_REQUIRED');let received=0,successfulScopes=0,firstError:unknown;
  const definitions:{action:string;categoryAction:string;kind:'LIVE'|'MOVIE'|'SERIES'}[]=[{action:'get_live_streams',categoryAction:'get_live_categories',kind:'LIVE'},{action:'get_vod_streams',categoryAction:'get_vod_categories',kind:'MOVIE'},{action:'get_series',categoryAction:'get_series_categories',kind:'SERIES'}];
  for(const definition of definitions){const{action,categoryAction,kind}=definition;if(kind==='LIVE'&&!source.syncLive||kind==='MOVIE'&&!source.syncMovies||kind==='SERIES'&&!source.syncSeries)continue;let data:Record<string,unknown>[];try{data=await this.xtreamAction(source,secret,action);successfulScopes++;}catch(error){firstError??=error;continue;}const categories=await this.xtreamCategories(source,secret,categoryAction);for(let at=0;at<data.length;at+=500){const output:NormalizedSourceItem[]=[];for(const raw of data.slice(at,at+500)){const id=String(raw.stream_id??raw.series_id??''),name=String(raw.name??raw.title??'Untitled');if(!id)continue;const categoryId=String(raw.category_id??''),providerCategory=String(raw.category_name??categoryId),category=categories.get(categoryId)??(providerCategory||'Sans catégorie'),streamRef=kind==='SERIES'?`xtream:series:${id}`:`xtream:${kind.toLowerCase()}:${id}`,backdrop=Array.isArray(raw.backdrop_path)?raw.backdrop_path[0]:raw.backdrop_path,logoUrl=String(raw.stream_icon??raw.cover??raw.cover_big??raw.movie_image??backdrop??'')||undefined;output.push({kind,remoteId:id,fingerprint:createHash('sha256').update(`${kind}|${normalize(name)}|${raw.year??''}`).digest('hex'),displayName:name,groupName:category,streamRef,logoUrl,classificationConfidence:1,classificationReason:[`provider:xtream:${action}`],genres:providerGenres(category,raw.genre,raw.plot),raw:{year:raw.year,rating:raw.rating,containerExtension:raw.container_extension,categoryId}});}received+=output.length;await onProgress?.(received,received);if(output.length)yield output;}}
  if(!successfulScopes&&firstError)throw firstError;
 }
 private async xtreamCategories(source:SourceAccount,secret:SourceCredentials,action:string){try{const data=await this.xtreamAction(source,secret,action);return new Map(data.map(raw=>[String(raw.category_id??raw.id??''),String(raw.category_name??raw.name??'Sans catégorie')]))}catch{return new Map<string,string>()}}
 private async xtreamAction(source:SourceAccount,secret:SourceCredentials,action:string){const url=new URL('/player_api.php',source.baseUrl);url.searchParams.set('username',secret.username!);url.searchParams.set('password',secret.password!);url.searchParams.set('action',action);return this.jsonArray(await this.fetch(source,url));}
 private direct(source:SourceAccount):NormalizedSourceItem{return{kind:'LIVE',remoteId:'direct',fingerprint:createHash('sha256').update(`LIVE|${source.id}`).digest('hex'),displayName:source.name,groupName:'Direct',streamRef:source.baseUrl,classificationConfidence:1,classificationReason:['provider:direct']};}
 private async jsonArray(response:Response){const text=await response.text();if(text.length>100_000_000)throw new Error('SOURCE_RESPONSE_TOO_LARGE');const value=JSON.parse(text) as unknown;if(!Array.isArray(value))throw new Error('SOURCE_RESPONSE_INVALID_JSON');return value as Record<string,unknown>[];}
}
