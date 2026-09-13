import {ConfigService} from '@nestjs/config';
import {JwtService} from '@nestjs/jwt';
import {ExecutionContext} from '@nestjs/common';
import {describe,expect,it,vi} from 'vitest';
import {AuthGuard} from '../src/auth/auth.guard';
import {AuthService} from '../src/auth/auth.service';
import {BrowserOriginGuard} from '../src/auth/browser-origin.guard';
import {MailService} from '../src/auth/mail.service';
import {PrismaService} from '../src/prisma/prisma.service';
const context=(request:unknown)=>({switchToHttp:()=>({getRequest:()=>request})}) as ExecutionContext;
describe('account authorization',()=>{
 it('uses current database roles and rejects suspended or revoked sessions',async()=>{
  const user={id:'one',role:'CUSTOMER',status:'ACTIVE',authVersion:2};
  const jwt={verifyAsync:vi.fn().mockResolvedValue({sub:'one',role:'SUPER_ADMIN',version:2})};
  const prisma={user:{findUnique:vi.fn().mockResolvedValue(user)}};
  const guard=new AuthGuard(jwt as unknown as JwtService,prisma as unknown as PrismaService);
  const request={headers:{authorization:'Bearer test'},user:undefined as unknown};
  await expect(guard.canActivate(context(request))).resolves.toBe(true);
  expect(request.user).toEqual({id:'one',role:'CUSTOMER'});
  prisma.user.findUnique.mockResolvedValue({...user,status:'SUSPENDED'});
  await expect(guard.canActivate(context(request))).rejects.toMatchObject({message:'SESSION_REVOKED'});
  prisma.user.findUnique.mockResolvedValue({...user,authVersion:3});
  await expect(guard.canActivate(context(request))).rejects.toMatchObject({message:'SESSION_REVOKED'});
 });
 it('rejects cross-origin cookie mutations',()=>{
  const guard=new BrowserOriginGuard({getOrThrow:()=> 'https://watch.example.net'} as unknown as ConfigService);
  expect(()=>guard.canActivate(context({method:'POST',cookies:{stream_refresh:'cookie'},headers:{origin:'https://other.example.net'}}))).toThrow();
  expect(guard.canActivate(context({method:'POST',cookies:{stream_refresh:'cookie'},headers:{origin:'https://watch.example.net'}}))).toBe(true);
 });
 it('does not issue a new session if another request already consumed the refresh token',async()=>{
  const record={id:'refresh',revokedAt:null,expiresAt:new Date(Date.now()+60000),user:{id:'one',status:'ACTIVE'}};
  const tx={refreshToken:{updateMany:vi.fn().mockResolvedValue({count:0}),create:vi.fn()}};
  const prisma={refreshToken:{findUnique:vi.fn().mockResolvedValue(record)},$transaction:vi.fn(async(callback:(value:unknown)=>unknown)=>callback(tx))};
  const config={getOrThrow:()=> 'pepper'};
  const service=new AuthService(prisma as unknown as PrismaService,{} as JwtService,config as unknown as ConfigService,{} as MailService);
  await expect(service.refresh('old-token')).rejects.toMatchObject({message:'INVALID_SESSION'});
  expect(tx.refreshToken.create).not.toHaveBeenCalled();
 });
 it('fails closed when production mail is not configured',()=>{
  const mail=new MailService({get:(key:string)=>key==='NODE_ENV'?'production':undefined} as unknown as ConfigService);
  expect(()=>mail.assertAvailable()).toThrow('EMAIL_DELIVERY_NOT_CONFIGURED');
 });
});
