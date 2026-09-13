import { describe, expect, it, vi } from 'vitest';
import { deliveryUrl, eventWindow, publicUrl } from '../src/platform/delivery-policy';
import { PlatformService } from '../src/platform/platform.service';
import { SourceConnectorsService } from '../src/sources/source-connectors.service';

describe('public delivery qualification', () => {
  it.each(['http://cdn.example/a.m3u8','https://user:pass@cdn.example/a.m3u8','https://127.0.0.1/a.m3u8','https://[::1]/a.m3u8','https://cdn.example/a.m3u8?token=secret','https://cdn.example/live/user/pass/1.m3u8'])('rejects private or credential-shaped URLs: %s', url => {
    expect(() => deliveryUrl('HLS', url)).toThrow();
  });
  it('accepts direct HLS and only approved embed origins', () => {
    expect(deliveryUrl('HLS','https://cdn.example/channel.m3u8')).toContain('channel.m3u8');
    expect(deliveryUrl('YOUTUBE','https://www.youtube-nocookie.com/embed/abcdefghijk')).toContain('/embed/');
    expect(() => deliveryUrl('YOUTUBE','https://evil.example/embed/abcdefghijk')).toThrow();
    expect(() => publicUrl('https://service.internal/a')).toThrow();
  });
  it('rejects reversed schedule windows', () => {
    expect(() => eventWindow('2026-09-13T12:00:00Z','2026-09-13T11:00:00Z')).toThrow();
  });
  it('never downloads media to test a direct source', async () => {
    const fetchSpy=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network must not be used'));
    try {
      const service=new SourceConnectorsService({validate:vi.fn().mockResolvedValue(new URL('https://cdn.example/a.m3u8'))} as never);
      const result=await service.test({type:'DIRECT',baseUrl:'https://cdn.example/a.m3u8',epgUrl:null,userAgent:null,allowedHosts:['cdn.example']},{});
      expect(result.capabilities?.requiresBrowserValidation).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {fetchSpy.mockRestore();}
  });
});
describe('public snapshot projection', () => {
  it('excludes unavailable channels and events; never returns source-account credentials', async () => {
    const future=new Date(Date.now()+3600000),past=new Date(Date.now()-3600000);
    const binding=(target:string)=>({id:target,target,label:'Public',kind:'HLS',url:'https://cdn.example/a.m3u8',countries:['ALL'],expiresAt:future,evidenceUrl:'https://cdn.example/permission',checkedAt:past});
    const prisma={
      $transaction:vi.fn().mockResolvedValue([[binding('channel:published'),binding('channel:draft'),binding('event:later'),binding('event:live'),binding('tmdb:movie:1')],[{id:'later',status:'SCHEDULED',startsAt:future,endsAt:future},{id:'live',status:'LIVE',startsAt:past,endsAt:future}],[]]),
      viewingBinding:{findMany:vi.fn()},sportsEvent:{findMany:vi.fn()},discoveryCollection:{findMany:vi.fn()},
      channel:{findMany:vi.fn().mockResolvedValue([{id:'published'}])},
    };
    const result=await new PlatformService(prisma as never).snapshot();
    expect(result.bindings.map(b=>b.target)).toEqual(['channel:published','event:live','tmdb:movie:1']);
    expect(result.bindings[0]).not.toHaveProperty('checkedAt');
    expect(Date.parse(result.validUntil)).toBeGreaterThan(Date.now());
    expect(prisma.channel.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({status:'PUBLISHED',webAvailable:true})}));
  });
});
