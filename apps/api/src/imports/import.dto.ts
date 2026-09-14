import { ImportChangeType, ImportedItemKind } from '@prisma/client';import { ArrayMaxSize,ArrayMinSize,ArrayUnique,IsArray,IsBoolean,IsEnum,IsIn,IsOptional,IsString,Length,Matches } from 'class-validator';
export class StartImportDto{@IsArray()@ArrayMinSize(1)@ArrayUnique()@ArrayMaxSize(3)@IsIn(['LIVE','MOVIE','SERIES'],{each:true})scope!:ImportedItemKind[];}
export class SelectionDto{@IsArray()@ArrayUnique()@ArrayMaxSize(10000)@IsString({each:true})selectedIds!:string[];}
export class ImportItemsQueryDto{@IsOptional()@IsEnum(ImportChangeType)changeType?:ImportChangeType;}
export class ImportRuleDto{@Matches(/^(groupName|displayName|kind)$/)field!:string;@IsString()@Length(1,200)pattern!:string;@IsOptional()@IsBoolean()exclude?:boolean;@IsOptional()@IsString()targetGenreId?:string;}
