import {describe,expect,it} from 'vitest';
import {available,Snapshot,watchPath} from './data';
const now=Date.parse('2026-09-13T12:00:00Z');
const snapshot:Snapshot={version:1,validUntil:'2026-09-13T12:01:00Z',channels:[],events:[],collections:[],bindings:[
 {id:'world',target:'channel:one',kind:'HLS',label:'World',url:'https://cdn.example/a.m3u8',countries:['ALL'],expiresAt:'2026-09-13T13:00:00Z'},
 {id:'region',target:'channel:one',kind:'HLS',label:'Regional',url:'https://cdn.example/b.m3u8',countries:['TN'],expiresAt:'2026-09-13T13:00:00Z'},
 {id:'expired',target:'channel:one',kind:'HLS',label:'Expired',url:'https://cdn.example/c.m3u8',countries:['ALL'],expiresAt:'2026-09-13T11:00:00Z'},
]};
describe('viewer availability contract',()=>{
 it('stops offering sources when the public snapshot expires',()=>{expect(available(snapshot,'channel:one','ALL',now+61_000)).toEqual([]);});
 it('offers worldwide and selected-region sources, excluding expired ones',()=>{expect(available(snapshot,'channel:one','TN',now).map(b=>b.id)).toEqual(['world','region']);expect(available(snapshot,'channel:one','FR',now).map(b=>b.id)).toEqual(['world']);});
 it('preserves episode identity when moving from library to playback',()=>{expect(watchPath('ar','tmdb:tv:123:s:2:e:4')).toBe('/ar/watch/tv/123?season=2&episode=4');});
 it('routes direct IPTV streams through the common watch page',()=>{expect(watchPath('en','iptv:abc_123-def')).toBe('/en/watch/iptv/abc_123-def');});
});
