import { SourceAccount } from '@prisma/client';
import { createHash } from 'node:crypto';
import { NormalizedSourceItem } from '../imports/m3u-parser';
import { SourceCredentials } from './source-vault.service';
import { UrlPolicyService } from './url-policy.service';

type PortalSource=Pick<SourceAccount,'baseUrl'|'allowedHosts'|'userAgent'|'syncLive'|'syncMovies'|'syncSeries'>;
type PortalSession={endpoint:URL;token:string;headers:Record<string,string>;profile:Record<string,unknown>};
type PortalProgress=(received:number,total:number)=>void|Promise<void>;
type ListOptions={maxItems:number;concurrency:number;onProgress?:PortalProgress};

export class PortalClient{
 constructor(private readonly policy:UrlPolicyService){}
 async connect(source:PortalSource,secret:SourceCredentials):Promise<PortalSession>{
  if(!secret.macAddress)throw new Error('PORTAL_MAC_REQUIRED');
  let reachable=false,lastCode='PORTAL_FORMAT_UNSUPPORTED';
  for(const endpoint of this.candidates(source.baseUrl))try{
   const handshake=await this.call(endpoint,source,secret,'stb','handshake',{},undefined,true);reachable=true;
   const token=String(handshake.token??'');if(!token){lastCode='PORTAL_HANDSHAKE_REJECTED';continue;}
   const headers=this.headers(source,secret,token),profile=await this.call(endpoint,source,secret,'stb','get_profile',{hd:'1',ver:'ImageDescription: 0.2.18-r23-254; ImageDate: 18 Jan 2017; PORTAL version: 5.6.0; API Version: JS API version: 343; STB API version: 146; Player Engine version: 0x58c',num_banks:'2',...(secret.serialNumber?{sn:secret.serialNumber}:{}),...(secret.deviceId?{device_id:secret.deviceId}:{}),...(secret.deviceId2?{device_id2:secret.deviceId2}:{}),...(secret.signature?{signature:secret.signature}:{})},headers);
   if(!profile||typeof profile!=='object')throw new Error('PORTAL_PROFILE_INVALID');
   return{endpoint,token,headers,profile};
  }catch(error){const code=error instanceof Error?error.message:'PORTAL_UNREACHABLE';if(code==='PORTAL_ENDPOINT_NOT_FOUND')continue;if(code==='PORTAL_UNREACHABLE')throw error;reachable=true;lastCode=code;}
  throw new Error(reachable?lastCode:'PORTAL_NOT_FOUND');
 }
 async catalogue(source:PortalSource,secret:SourceCredentials,onProgress?:PortalProgress):Promise<NormalizedSourceItem[]>{
  const session=await this.connect(source,secret),out:NormalizedSourceItem[]=[];
  if(source.syncLive){const genres=await this.categories(session,source,secret,'itv'),data=await this.liveChannels(session,source,secret,onProgress);for(const raw of data){const item=this.item(raw,'LIVE',genres);if(item)out.push(item);}}
  if(source.syncMovies){const[genres,data]=await Promise.all([this.categories(session,source,secret,'vod'),this.list(session,source,secret,'vod','get_ordered_list')]);for(const raw of data){const item=this.item(raw,'MOVIE',genres);if(item)out.push(item);}}
  if(source.syncSeries){const[genres,data]=await Promise.all([this.categories(session,source,secret,'series'),this.list(session,source,secret,'series','get_ordered_list')]);for(const raw of data){const item=this.item(raw,'SERIES',genres);if(item)out.push(item);}}
  return out;
 }
 async resolve(source:PortalSource,secret:SourceCredentials,reference:string){
  const match=/^portal:(itv|vod|series):(.+)$/.exec(reference);if(!match)throw new Error('PORTAL_REFERENCE_INVALID');
  const command=Buffer.from(match[2],'base64url').toString('utf8'),direct=command.trim().replace(/^(?:ffmpeg|ffrt2|ffrt3|ffrt|auto)\s+/i,'');
  try{const parsed=new URL(direct),ready=/\/play\/(?:live|movie|series)\.php$/i.test(parsed.pathname)||parsed.searchParams.has('stream')||/\.(?:m3u8?|ts)$/i.test(parsed.pathname);if(ready&&!['localhost','127.0.0.1'].includes(parsed.hostname))return direct;}catch{/* Portal placeholders are resolved below. */}
  const session=await this.connect(source,secret);
  const value=await this.call(session.endpoint,source,secret,match[1],'create_link',{cmd:command,series:'0',forced_storage:'0',disable_ad:'0'},session.headers);
  const raw=String(value.cmd??value.url??'').trim().replace(/^(?:ffmpeg|ffrt|auto)\s+/i,'');
  const found=raw.match(/https?:\/\/\S+/)?.[0];if(!found)throw new Error('PORTAL_STREAM_LINK_UNAVAILABLE');return found;
 }
 private async categories(session:PortalSession,source:PortalSource,secret:SourceCredentials,type:string){try{const data=await this.call(session.endpoint,source,secret,type,'get_genres',{},session.headers),values=this.array(data);return new Map(values.map(value=>[String(value.id??value.category_id??''),String(value.title??value.name??'Sans catégorie')]))}catch{return new Map<string,string>()}}
 private async liveChannels(session:PortalSession,source:PortalSource,secret:SourceCredentials,onProgress?:PortalProgress){
  try{const bulk=await this.list(session,source,secret,'itv','get_all_channels',{}, {maxItems:30_000,concurrency:1,onProgress});if(bulk.length)return bulk;}catch(error){if(error instanceof Error&&!['PORTAL_REQUEST_TIMEOUT','PORTAL_UNREACHABLE','PORTAL_RESPONSE_INVALID','PORTAL_HTTP_429'].some(code=>error.message.startsWith(code)))throw error;}
  const output=await this.list(session,source,secret,'itv','get_ordered_list',{genre:'*',fav:'0',sortby:'number'},{maxItems:30_000,concurrency:4,onProgress});
  if(!output.length)throw new Error('PORTAL_CATALOGUE_UNAVAILABLE');return output;
 }
 private async list(session:PortalSession,source:PortalSource,secret:SourceCredentials,type:string,action:string,extra:Record<string,string>={},options:ListOptions={maxItems:1_400,concurrency:4}){
  const fetchPage=(page:number)=>this.call(session.endpoint,source,secret,type,action,{...extra,p:String(page)},session.headers);
  const first=await fetchPage(1),output=this.array(first),total=Number(first.total_items??output.length),perPage=Math.max(1,Number(first.max_page_items??output.length)),pages=Math.min(Math.ceil(total/perPage),Math.ceil(options.maxItems/perPage));await options.onProgress?.(output.length,Math.min(total,options.maxItems));
  for(let page=2;page<=pages;page+=options.concurrency){
   const numbers=Array.from({length:Math.min(options.concurrency,pages-page+1)},(_,offset)=>page+offset);
   const batch=await Promise.all(numbers.map(async current=>{try{return await fetchPage(current)}catch{try{return await fetchPage(current)}catch{return undefined}}}));
   for(const next of batch)if(next)output.push(...this.array(next));await options.onProgress?.(output.length,Math.min(total,options.maxItems));
  }
  return output;
 }
 private item(raw:Record<string,unknown>,kind:'LIVE'|'MOVIE'|'SERIES',genres:Map<string,string>):NormalizedSourceItem|null{const remoteId=String(raw.id??raw.ch_id??raw.movie_id??raw.series_id??''),displayName=String(raw.name??raw.title??'').trim(),command=String(raw.cmd??raw.url??'').trim();if(!remoteId||!displayName||!command)return null;const portalType=kind==='LIVE'?'itv':kind==='MOVIE'?'vod':'series',streamRef=`portal:${portalType}:${Buffer.from(command).toString('base64url')}`,groupId=String(raw.tv_genre_id??raw.category_id??raw.genre_id??'');return{kind,remoteId,fingerprint:createHash('sha256').update(`${kind}|${displayName.toLowerCase()}|${remoteId}`).digest('hex'),displayName,groupName:genres.get(groupId)??String(raw.category_name??'Sans catégorie'),streamRef,logoUrl:String(raw.logo??raw.screenshot_uri??raw.cover??'')||undefined,raw:{year:raw.year,rating:raw.rating,portalType}}}
 private async call(endpoint:URL,source:PortalSource,secret:SourceCredentials,type:string,action:string,extra:Record<string,string>,headers?:Record<string,string>,probing=false):Promise<Record<string,unknown>>{
  let url=new URL(endpoint);url.search=new URLSearchParams({type,action,JsHttpRequest:'1-xml',...extra}).toString();let response:Response|undefined;
  try{
   for(let redirects=0;redirects<4;redirects++){
    await this.policy.validate(url.toString(),source.allowedHosts);
    const timeoutMs=action==='get_genres'?8_000:action==='get_all_channels'?5_000:action==='get_ordered_list'?30_000:15_000;
    response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(timeoutMs),headers:headers??this.headers(source,secret)});
    if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw new Error('PORTAL_RESPONSE_INVALID');url=new URL(location,url);continue}break;
   }
   if(!response)throw new Error('PORTAL_UNREACHABLE');if([404,405].includes(response.status))throw new Error('PORTAL_ENDPOINT_NOT_FOUND');if([401,403].includes(response.status))throw new Error('PORTAL_AUTH_FAILED');if(!response.ok)throw new Error(`PORTAL_HTTP_${response.status}`);
   const text=(await response.text()).trim();if(!text||/^</.test(text)){if(probing)throw new Error('PORTAL_FORMAT_UNSUPPORTED');throw new Error('PORTAL_RESPONSE_INVALID')}
   let body:Record<string,unknown>;try{body=JSON.parse(text) as Record<string,unknown>}catch{throw new Error('PORTAL_RESPONSE_INVALID')}
   const js=(body.js??body) as Record<string,unknown>;if(js.not_valid===1||js.not_valid==='1')throw new Error('PORTAL_AUTH_FAILED');return js;
  }catch(error){
   if(error instanceof Error&&['PORTAL_RESPONSE_INVALID','PORTAL_ENDPOINT_NOT_FOUND','PORTAL_AUTH_FAILED','PORTAL_FORMAT_UNSUPPORTED'].includes(error.message))throw error;
   if(error instanceof Error&&error.message.startsWith('PORTAL_HTTP_'))throw error;
   if(error instanceof Error&&['AbortError','TimeoutError'].includes(error.name))throw new Error('PORTAL_REQUEST_TIMEOUT');
   throw new Error('PORTAL_UNREACHABLE');
  }
 }
 private array(value:Record<string,unknown>):Record<string,unknown>[]{const data=value.data??value;return Array.isArray(data)?data.filter(item=>item&&typeof item==='object') as Record<string,unknown>[]:[]}
 private headers(source:PortalSource,secret:SourceCredentials,token?:string){const mac=secret.macAddress!,cookie=[`mac=${encodeURIComponent(mac)}`,'stb_lang=en','timezone=Europe%2FParis',secret.serialNumber&&`sn=${encodeURIComponent(secret.serialNumber)}`,secret.deviceId&&`device_id=${encodeURIComponent(secret.deviceId)}`,secret.deviceId2&&`device_id2=${encodeURIComponent(secret.deviceId2)}`].filter(Boolean).join('; '),root=new URL(source.baseUrl);return{'user-agent':source.userAgent??'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 2721 Safari/533.3','x-user-agent':'Model: MAG250; Link: WiFi','referer':`${root.origin}/c/`,'accept':'application/json, text/javascript, */*; q=0.01','accept-encoding':'gzip, deflate',cookie,...(token?{authorization:`Bearer ${token}`}:{})}}
 private candidates(raw:string){const base=new URL(raw),paths=new Set<string>();if(/\/(?:portal\.php|server\/load\.php)$/i.test(base.pathname))paths.add(base.pathname);const prefix=base.pathname.replace(/\/(?:c(?:\/.*)?|portal\.php|server\/load\.php).*$/i,'').replace(/\/$/,'');for(const path of[`${prefix}/portal.php`,`${prefix}/server/load.php`,`${prefix}/stalker_portal/server/load.php`,`${prefix}/stalker_portal/portal.php`,'/portal.php','/server/load.php','/stalker_portal/server/load.php','/stalker_portal/portal.php'])paths.add(path.replace(/\/+/g,'/'));return[...paths].map(path=>new URL(path,base.origin))}
}
