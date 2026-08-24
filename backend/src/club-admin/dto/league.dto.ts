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

export class CreateLeagueDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rulesText?: string;

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
  @MaxLength(5000)
  rulesText?: string;

  @IsOptional()
  @IsEnum(LeagueState)
  state?: LeagueState;
}

export class CreateSeasonDto {
  @IsString()
  @MaxLength(200)
  label: string;

  @Type(() => Date)
  @IsDate()
  registrationOpensAt: Date;

  @Type(() => Date)
  @IsDate()
  registrationClosesAt: Date;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @IsInt()
  @Min(1)
  @Max(52)
  roundCount: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  roundIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  capacity?: number;
}

export class UpdateSeasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

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
  @Min(2)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
