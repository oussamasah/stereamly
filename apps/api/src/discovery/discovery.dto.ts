import{Type}from'class-transformer';import{IsBoolean,IsInt,IsObject,IsOptional,IsString,Length,Max,Min}from'class-validator';
export class SearchDto{@IsString()@Length(1,120)q!:string;@IsOptional()@Type(()=>Number)@IsInt()@Min(1)@Max(50)limit=20;}
export class TargetDto{@IsOptional()@IsString()mediaTitleId?:string;@IsOptional()@IsString()episodeId?:string;@IsOptional()@IsString()channelId?:string;}
export class ProgressDto extends TargetDto{@IsInt()@Min(0)positionSec!:number;@IsOptional()@IsInt()@Min(1)durationSec?:number;@IsBoolean()completed!:boolean;@IsOptional()@IsString()@Length(1,120)deviceId?:string;}
export class LibraryImportDto{@IsObject()library!:Record<string,unknown>;}
export class PopularityDto{@IsString()mediaTitleId!:string;@IsBoolean()completed!:boolean;}
