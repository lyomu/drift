import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FormatPreference, StylePreference, TimeBlock } from '@prisma/client';

export class SearchPlayersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  maxDistanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(7.0)
  levelMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(7.0)
  levelMax?: number;

  @IsOptional()
  @IsEnum(FormatPreference)
  formatPreference?: FormatPreference;

  @IsOptional()
  @IsEnum(StylePreference)
  stylePreference?: StylePreference;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsEnum(TimeBlock)
  timeBlock?: TimeBlock;

  @IsOptional()
  @IsString()
  clubName?: string;

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
