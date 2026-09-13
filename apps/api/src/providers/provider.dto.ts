import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class ProviderQueryDto {
  @IsOptional() @IsIn(['vod', 'live', 'sports']) category?: string;
}

export class StreamProviderDto {
  @IsString() @Length(2, 100) name!: string;
  @IsString() @Length(2, 80) @Matches(/^[a-z0-9-]+$/) slug!: string;
  @IsIn(['vod', 'live', 'sports']) category!: string;
  @IsOptional() @Matches(/^https?:\/\/\S+$/) movieTemplate?: string;
  @IsOptional() @Matches(/^https?:\/\/\S+$/) tvTemplate?: string;
  @IsOptional() @Matches(/^https?:\/\/\S+$/) streamUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) rank?: number;
}
