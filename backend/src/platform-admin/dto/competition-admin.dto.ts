import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MatchFormat, MatchSport } from '@prisma/client';

export class UpsertCompetitionRulesetDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(MatchSport)
  sport!: MatchSport;

  @IsEnum(MatchFormat)
  format!: MatchFormat;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(['LEAGUE', 'TOURNAMENT', 'LADDER'], { each: true })
  competitionTypes!: string[];

  @IsString()
  @MaxLength(200)
  scoringFormat!: string;

  @IsString()
  @MaxLength(500)
  walkoverRule!: string;

  @IsString()
  @MaxLength(500)
  unfinishedMatchPolicy!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  rulesText?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
