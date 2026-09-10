import { ImportChangeType, ImportedItemKind } from '@prisma/client';import { ArrayMaxSize,ArrayUnique,IsArray,IsBoolean,IsEnum,IsOptional,IsString,Length,Matches } from 'class-validator';
export class StartImportDto{@IsArray()@ArrayUnique()@ArrayMaxSize(6)@IsEnum(ImportedItemKind,{each:true})scope!:ImportedItemKind[];}
export class SelectionDto{@IsArray()@ArrayUnique()@ArrayMaxSize(10000)@IsString({each:true})selectedIds!:string[];}
export class ImportItemsQueryDto{@IsOptional()@IsEnum(ImportChangeType)changeType?:ImportChangeType;}
export class ImportRuleDto{@Matches(/^(groupName|displayName|kind)$/)field!:string;@IsString()@Length(1,200)pattern!:string;@IsOptional()@IsBoolean()exclude?:boolean;@IsOptional()@IsString()targetGenreId?:string;}
