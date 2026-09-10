import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

@Injectable()
export class UrlPolicyService {
  async validate(raw:string, allowedHosts:string[]) { let url:URL;try{url=new URL(raw);}catch{throw new BadRequestException('SOURCE_URL_INVALID');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port))throw new BadRequestException('SOURCE_URL_BLOCKED');const host=url.hostname.toLowerCase().replace(/\.$/,'');if(!this.allowed(host,allowedHosts))throw new BadRequestException('SOURCE_HOST_NOT_ALLOWED');const addresses=isIP(host)?[{address:host}]:await lookup(host,{all:true,verbatim:true}).catch(()=>{throw new BadRequestException('SOURCE_HOST_UNRESOLVABLE');});if(addresses.some(({address})=>this.privateIp(address)))throw new BadRequestException('SOURCE_PRIVATE_NETWORK_BLOCKED');return url; }
  private allowed(host:string,list:string[]){return list.map(v=>v.toLowerCase()).some(v=>host===v||host.endsWith(`.${v}`));}
  private privateIp(ip:string):boolean{const value=ip.toLowerCase();if(value==='::1'||value==='0:0:0:0:0:0:0:1'||value.startsWith('fe80:')||value.startsWith('fc')||value.startsWith('fd'))return true;if(value.startsWith('::ffff:'))return this.privateIp(value.slice(7));const p=value.split('.').map(Number);return p.length===4&&(p[0]===10||p[0]===127||p[0]===0||p[0]===169&&p[1]===254||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&p[1]===168||p[0]>=224);}
}
