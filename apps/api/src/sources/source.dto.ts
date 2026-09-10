import { SourceType } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Length, Matches, Max, Min, ValidateIf } from 'class-validator';

export class SourceSecretsDto {
  @IsOptional() @IsString() @Length(1, 300) username?: string;
  @IsOptional() @IsString() @Length(1, 500) password?: string;
  @IsOptional() @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/) macAddress?: string;
  @IsOptional() @IsString() @Length(1, 200) serialNumber?: string;
  @IsOptional() @IsString() @Length(1, 300) deviceId?: string;
  @IsOptional() @IsString() @Length(1, 300) deviceId2?: string;
  @IsOptional() @IsString() @Length(1, 500) signature?: string;
  @IsOptional() @IsString() @Length(1, 1000) apiToken?: string;
}

export class SourceAccountDto extends SourceSecretsDto {
  @IsString() @Length(2, 100) name!: string;
  @IsEnum(SourceType) type!: SourceType;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) baseUrl!: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) regionCode?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) priority?: number;
  @IsOptional() @IsBoolean() syncLive?: boolean;
  @IsOptional() @IsBoolean() syncMovies?: boolean;
  @IsOptional() @IsBoolean() syncSeries?: boolean;
  @IsOptional() @IsBoolean() syncEpg?: boolean;
  @IsOptional() @IsString() @Length(1, 300) userAgent?: string;
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) epgUrl?: string;
  @IsOptional() @IsInt() @Min(15) @Max(43_200) refreshIntervalMin?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10_000) maxConcurrentStreams?: number;
  @IsOptional() @IsBoolean() preferHls?: boolean;
  @IsArray() @ArrayUnique() @ArrayMaxSize(30) @Matches(/^[a-z0-9.-]+$/i, { each: true }) allowedHosts!: string[];
  @ValidateIf(o => o.type === SourceType.XTREAM) @IsString() @Length(1, 300) declare username?: string;
  @ValidateIf(o => o.type === SourceType.XTREAM) @IsString() @Length(1, 500) declare password?: string;
  @ValidateIf(o => o.type === SourceType.PORTAL_MAC) @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/) declare macAddress?: string;
}

export class SourceUpdateDto extends SourceAccountDto {}

export class PublishSourceChannelsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ArrayUnique() @IsString({ each: true }) itemIds!: string[];
  @IsOptional() @IsString() categoryId?: string;
  @Matches(/^(ALL|[A-Z]{2})$/) countryCode!: string;
  @IsBoolean() rightsConfirmed!: boolean;
}
