import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type SourceCredentials = { username?:string; password?:string; macAddress?:string; serialNumber?:string; deviceId?:string; deviceId2?:string; signature?:string; apiToken?:string };
export type EncryptedSecret = { ciphertext:string; iv:string; authTag:string; keyVersion:number };

@Injectable()
export class SourceVaultService {
  private readonly key: Buffer;
  constructor(config: ConfigService) { this.key = createHash('sha256').update(config.getOrThrow<string>('SOURCE_ENCRYPTION_KEY')).digest(); }
  encrypt(value: SourceCredentials): EncryptedSecret { const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',this.key,iv);const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return{ciphertext:ciphertext.toString('base64'),iv:iv.toString('base64'),authTag:cipher.getAuthTag().toString('base64'),keyVersion:1}; }
  decrypt(value: EncryptedSecret): SourceCredentials { const decipher=createDecipheriv('aes-256-gcm',this.key,Buffer.from(value.iv,'base64'));decipher.setAuthTag(Buffer.from(value.authTag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext,'base64')),decipher.final()]).toString('utf8')) as SourceCredentials; }
  flags(value: SourceCredentials) { return { hasUsername:!!value.username,hasPassword:!!value.password,hasMacAddress:!!value.macAddress,hasSerialNumber:!!value.serialNumber,hasDeviceId:!!value.deviceId,hasDeviceId2:!!value.deviceId2,hasSignature:!!value.signature,hasApiToken:!!value.apiToken,username:!!value.username,password:!!value.password,macAddress:!!value.macAddress }; }
}
