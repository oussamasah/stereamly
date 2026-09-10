import { BillingPeriod, PublicationStatus } from '@prisma/client';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsISO8601, IsInt, IsObject, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class PriceDto {
  @Matches(/^[A-Z]{3}$/) currency!: string;
  @IsEnum(BillingPeriod) period!: BillingPeriod;
  @IsInt() @Min(0) @Max(100_000_000) amountMinor!: number;
}
export class RightDto {
  @Matches(/^(ALL|[A-Z]{2})$/) countryCode!: string;
  @IsBoolean() webAllowed!: boolean; @IsBoolean() mobileAllowed!: boolean; @IsBoolean() tvAllowed!: boolean;
  @IsISO8601() validFrom!: string; @IsISO8601() validUntil!: string;
  @IsBoolean() approved!: boolean; @IsOptional() @IsString() @Length(1, 120) contractRef?: string;
}
export class CategoryDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsObject() names!: Record<string, string>;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class ChannelDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsObject() names!: Record<string, string>; @IsOptional() @IsObject() description?: Record<string, string>;
  @IsOptional() @IsString() logoUrl?: string; @Matches(/^[a-z]{2,3}$/) languageCode!: string; @Matches(/^(ALL|[A-Z]{2})$/) countryCode!: string;
  @IsString() categoryId!: string; @IsOptional() @IsInt() @Min(0) sortOrder?: number; @IsOptional() @IsBoolean() webAvailable?: boolean; @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus; @IsOptional() @IsISO8601() scheduledFor?: string;
  @IsArray() @ArrayMaxSize(250) @ValidateNested({ each: true }) @Type(() => PriceDto) prices!: PriceDto[];
  @IsArray() @ArrayMaxSize(250) @ValidateNested({ each: true }) @Type(() => RightDto) rights!: RightDto[];
}
export class PackageDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string; @IsObject() names!: Record<string, string>;
  @IsOptional() @IsObject() description?: Record<string, string>; @IsOptional() @IsObject() badge?: Record<string, string>;
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus; @IsOptional() @IsBoolean() featured?: boolean; @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsInt() @Min(1) @Max(20) maxDevices!: number; @IsInt() @Min(1) @Max(20) maxConcurrentStreams!: number;
  @IsArray() @ArrayUnique() @ArrayMaxSize(250) @Matches(/^(ALL|[A-Z]{2})$/, { each: true }) allowedCountries!: string[];
  @IsArray() @ArrayUnique() @ArrayMaxSize(500) @IsString({ each: true }) channelIds!: string[];
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PriceDto) prices!: PriceDto[];
  @IsOptional() @IsISO8601() scheduledFor?: string;
}
export class CatalogQueryDto {
  @Matches(/^[A-Z]{2}$/) country!: string; @Matches(/^[A-Z]{3}$/) currency!: string;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) language?: string; @IsOptional() @IsString() category?: string; @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 24;
}
export class QuoteDto {
  @Matches(/^[A-Z]{2}$/) country!: string; @Matches(/^[A-Z]{3}$/) currency!: string; @IsEnum(BillingPeriod) period!: BillingPeriod;
  @IsArray() @ArrayUnique() @ArrayMaxSize(100) @IsString({ each: true }) channelIds!: string[];
}

