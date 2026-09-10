import { CreditType, MediaImageType, MediaType, PlaybackProtocol, PublicationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsISO8601, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUrl, Length, Matches, Max, Min, ValidateNested } from 'class-validator';

export class MediaImageDto {
  @IsEnum(MediaImageType) type!: MediaImageType;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) url!: string;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) languageCode?: string;
  @IsOptional() @IsInt() @Min(1) width?: number;
  @IsOptional() @IsInt() @Min(1) height?: number;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class ExternalIdDto {
  @Matches(/^[a-z0-9][a-z0-9_-]{1,39}$/) provider!: string;
  @IsString() @Length(1, 200) externalId!: string;
}
export class CreditDto {
  @IsString() personId!: string;
  @IsEnum(CreditType) type!: CreditType;
  @IsOptional() @IsString() @Length(1, 120) character?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class PlaybackVariantDto {
  @IsString() @Length(1, 100) label!: string;
  @IsEnum(PlaybackProtocol) protocol!: PlaybackProtocol;
  @IsString() @Length(1, 2048) reference!: string;
  @IsOptional() @IsString() @Length(1, 30) quality?: string;
  @IsOptional() @IsString() @Length(1, 30) videoCodec?: string;
  @IsOptional() @IsString() @Length(1, 30) audioCodec?: string;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) languageCode?: string;
  @IsArray() @ArrayUnique() @ArrayMaxSize(100) @Matches(/^(ALL|[A-Z]{2})$/, { each: true }) regionCodes!: string[];
  @IsOptional() @IsInt() @Min(0) @Max(10_000) priority?: number;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class EpisodeDto {
  @IsInt() @Min(0) episodeNumber!: number;
  @IsObject() names!: Record<string, string>;
  @IsOptional() @IsObject() synopsis?: Record<string, string>;
  @IsOptional() @IsInt() @Min(1) durationSec?: number;
  @IsOptional() @IsISO8601() airedAt?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => MediaImageDto) images!: MediaImageDto[];
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ExternalIdDto) externalIds!: ExternalIdDto[];
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => PlaybackVariantDto) playbackVariants!: PlaybackVariantDto[];
}

export class SeasonDto {
  @IsInt() @Min(0) seasonNumber!: number;
  @IsOptional() @IsObject() names?: Record<string, string>;
  @IsOptional() @IsObject() synopsis?: Record<string, string>;
  @IsOptional() @IsInt() @Min(1888) @Max(2200) releaseYear?: number;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => EpisodeDto) episodes!: EpisodeDto[];
}

export class MediaTitleDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsEnum(MediaType) type!: MediaType;
  @IsObject() names!: Record<string, string>;
  @IsOptional() @IsObject() alternativeNames?: Record<string, string>;
  @IsOptional() @IsObject() synopsis?: Record<string, string>;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) originalLanguage?: string;
  @IsArray() @ArrayUnique() @ArrayMaxSize(100) @Matches(/^[A-Z]{2}$/, { each: true }) countryCodes!: string[];
  @IsOptional() @IsInt() @Min(1888) @Max(2200) releaseYear?: number;
  @IsOptional() @IsString() @Length(1, 20) ageRating?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(10) rating?: number;
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) trailerUrl?: string;
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsISO8601() scheduledFor?: string;
  @IsArray() @ArrayUnique() @ArrayMaxSize(50) @IsString({ each: true }) genreIds!: string[];
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => MediaImageDto) images!: MediaImageDto[];
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ExternalIdDto) externalIds!: ExternalIdDto[];
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => PlaybackVariantDto) playbackVariants!: PlaybackVariantDto[];
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => CreditDto) credits: CreditDto[] = [];
  @IsOptional() @IsInt() @Min(1) durationSec?: number;
  @IsOptional() @IsString() @Length(1, 40) seriesStatus?: string;
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => SeasonDto) seasons!: SeasonDto[];
}

export class GenreDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsObject() names!: Record<string, string>;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class MediaQueryDto {
  @IsOptional() @IsEnum(MediaType) type?: MediaType;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() genre?: string;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) language?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) country?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1888) @Max(2200) year?: number;
  @IsOptional() @IsString() quality?: string;
  @IsOptional() @Matches(/^(recent|rating|year|title)$/) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 24;
}
