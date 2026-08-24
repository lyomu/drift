import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MatchResultOutcome, MatchSide } from '@prisma/client';

export class SetScoreDto {
  @IsInt()
  @Min(0)
  @Max(20)
  sideAGames: number;

  @IsInt()
  @Min(0)
  @Max(20)
  sideBGames: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sideATiebreak?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sideBTiebreak?: number;
}

/**
 * One "version" of a result — used identically for the initial submission,
 * the disputer's counter-version, and a resubmission during DISPUTED. The
 * server derives `winningSide` from `sets` for a SCORE outcome (never
 * trusts a client-supplied winner when a score is present); for
 * WALKOVER/RETIREMENT the caller states it directly since there's no score
 * to derive it from.
 */
export class ResultVersionDto {
  @IsEnum(MatchResultOutcome)
  outcome: MatchResultOutcome;

  @ValidateIf(
    (dto: ResultVersionDto) => dto.outcome === MatchResultOutcome.SCORE,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SetScoreDto)
  sets?: SetScoreDto[];

  @ValidateIf(
    (dto: ResultVersionDto) => dto.outcome !== MatchResultOutcome.SCORE,
  )
  @IsOptional()
  @IsEnum(MatchSide)
  winningSide?: MatchSide;
}
