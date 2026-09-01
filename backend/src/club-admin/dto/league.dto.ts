import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LeagueState, MatchFormat, MatchSport } from '@prisma/client';

/**
 * A league is a single competition run since M15 — registration window,
 * round count and capacity live here directly, no Season DTO.
 */
export class CreateLeagueDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // HTML from the Club Admin WYSIWYG editor — sanitised server-side in
  // CompetitionsService before it is stored. The cap is generous vs. the
  // plain-text equivalent to leave room for tag overhead.
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  rulesText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  scoringFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  walkoverRule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  unfinishedMatchPolicy?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationOpensAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationClosesAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  roundCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  roundIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  capacity?: number;

  @IsOptional()
  @IsEnum(MatchSport)
  sport?: MatchSport;

  @IsOptional()
  @IsEnum(MatchFormat)
  format?: MatchFormat;
}

export class UpdateLeagueDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  rulesText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  scoringFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  walkoverRule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  unfinishedMatchPolicy?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationOpensAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationClosesAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  roundCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  roundIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;

  @IsOptional()
  @IsEnum(LeagueState)
  state?: LeagueState;
}

export class IssueLeagueAwardDto {
  @IsString()
  recipientId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
