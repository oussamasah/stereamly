import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortalClient } from '../src/sources/portal-client';

const policy={validate:vi.fn(async(raw:string)=>new URL(raw))};
const source={baseUrl:'https://portal.example/c/',allowedHosts:['portal.example'],userAgent:null,syncLive:true,syncMovies:false,syncSeries:false};
const secret={macAddress:'00:1A:79:12:34:56'};

describe('PortalClient',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('authenticates and imports channels from a detected Ministra endpoint',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:URL)=>{const action=input.searchParams.get('action');if(action==='handshake')return json({js:{token:'token-1'}});if(action==='get_profile')return json({js:{id:7,status:1}});if(action==='get_genres')return json({js:[{id:'1',title:'News'}]});if(action==='get_all_channels')return json({js:{data:[{id:'10',name:'Demo TV',cmd:'ffmpeg https://cdn.example/live.m3u8',tv_genre_id:'1',logo:'https://img.example/demo.png'}],total_items:1,max_page_items:10}});return new Response('',{status:404});}));
  const client=new PortalClient(policy as never),items=await client.catalogue(source as never,secret);
  expect(items).toHaveLength(1);expect(items[0]).toMatchObject({kind:'LIVE',remoteId:'10',displayName:'Demo TV',groupName:'News'});expect(items[0].streamRef).toMatch(/^portal:itv:/);
 });
 it('resolves a fresh playback link through create_link',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:URL)=>{const action=input.searchParams.get('action');if(action==='handshake')return json({js:{token:'token-1'}});if(action==='get_profile')return json({js:{id:7}});if(action==='create_link')return json({js:{cmd:'ffmpeg https://cdn.example/session/live.m3u8'}});return new Response('',{status:404});}));
  const ref=`portal:itv:${Buffer.from('ffmpeg http://origin/10').toString('base64url')}`;
  await expect(new PortalClient(policy as never).resolve(source as never,secret,ref)).resolves.toBe('https://cdn.example/session/live.m3u8');
 });
 it('streams every ordered catalogue page without a fixed item cap',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:URL)=>{const action=input.searchParams.get('action');if(action==='handshake')return json({js:{token:'token-1'}});if(action==='get_profile')return json({js:{id:7,status:1}});if(action==='get_genres')return json({js:[{id:'1',title:'News'}]});if(action==='get_ordered_list'){const page=Number(input.searchParams.get('p')??1);return json({js:{data:[{id:String(page),name:`TV ${page}`,cmd:`ffmpeg https://cdn.example/${page}.m3u8`,tv_genre_id:'1'}],total_items:3,max_page_items:1}});}return new Response('',{status:404});}));
  const batches=[];for await(const batch of new PortalClient(policy as never).catalogueBatches(source as never,secret))batches.push(batch);
  expect(batches.flat().map(item=>item.remoteId)).toEqual(['1','2','3']);
 });
 it('keeps an already resolved play/live.php stream without another portal call',async()=>{
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  const direct='http://stream.example/play/live.php?mac=AA&stream=947766&extension=ts',ref=`portal:itv:${Buffer.from(direct).toString('base64url')}`;
  await expect(new PortalClient(policy as never).resolve(source as never,secret,ref)).resolves.toBe(direct);
  expect(fetchMock).not.toHaveBeenCalled();
 });
});
function json(value:unknown){return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}})}
