import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
export const targetPattern = /^(?:tmdb:movie:[1-9]\d*|tmdb:tv:[1-9]\d*(?::s:\d+:e:[1-9]\d*)?|channel:[\w-]+|event:[\w-]+)$/;
export class BindingDto {
    @Matches(targetPattern)
    target!: string;
    @IsString()
    @Length(2, 100)
    label!: string;
    @IsIn(['HLS', 'YOUTUBE', 'VIMEO'])
    kind!: string;
    @IsString()
    @Length(8, 2000)
    url!: string;
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    @ArrayUnique()
    @Matches(/^(ALL|[A-Z]{2})$/, { each: true })
    countries!: string[];
    @IsString()
    @Length(8, 2000)
    evidenceUrl!: string;
    @IsISO8601()
    expiresAt!: string;
    @IsBoolean()
    enabled!: boolean;
    @IsBoolean()
    rightsConfirmed!: boolean;
    @IsBoolean()
    browserConfirmed!: boolean;
}
export class EventDto {
    @IsString()
    @Length(2, 160)
    title!: string;
    @IsString()
    @Length(2, 60)
    sport!: string;
    @IsString()
    @Length(2, 100)
    competition!: string;
    @IsISO8601()
    startsAt!: string;
    @IsISO8601()
    endsAt!: string;
    @IsIn(['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'])
    status!: string;
    @IsBoolean()
    published!: boolean;
}
export class CollectionDto {
    @IsObject()
    names!: Record<string, string>;
    @IsArray()
    @ArrayMaxSize(40)
    @ArrayUnique()
    @Matches(targetPattern, { each: true })
    targets!: string[];
    @IsInt()
    @Min(0)
    @Max(1000)
    position!: number;
    @IsBoolean()
    published!: boolean;
}
export class ToggleDto {
    @IsBoolean()
    enabled!: boolean;
}
export class ChannelQueryDto {
    @IsOptional()
    @IsString()
    @Length(0, 100)
    search?: string;
}
