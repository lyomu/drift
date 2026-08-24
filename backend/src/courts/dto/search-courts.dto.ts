import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CourtSurface, MatchSport } from '@prisma/client';

// class-transformer's @Type(() => Boolean) coerces any non-empty string
// (including "false") to true, so query-string booleans need an explicit
// string comparison instead.
const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true';

export class SearchCourtsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  maxDistanceKm?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(CourtSurface, { each: true })
  @Transform(({ value }: { value: unknown }): unknown[] =>
    Array.isArray(value) ? value : [value],
  )
  surfaces?: CourtSurface[];

  @IsOptional()
  @IsEnum(MatchSport)
  sport?: MatchSport;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  indoor?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  lighting?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasBookingInfo?: boolean;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  independentOnly?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}
