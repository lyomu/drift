import { MatchFormat, MatchSport } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateMatchDto {
  @IsUUID()
  opponentId: string;

  @IsOptional()
  @IsEnum(MatchFormat)
  format?: MatchFormat;

  /** Best of 3 or best of 5 sets. Defaults to 3. */
  @IsOptional()
  @IsIn([3, 5])
  bestOfSets?: number;

  @IsOptional()
  @IsEnum(MatchSport)
  sport?: MatchSport;

  /**
   * The challenger's own doubles partner. Required for DOUBLES — the
   * opponent nominates theirs when they accept.
   */
  @ValidateIf((dto: CreateMatchDto) => dto.format === MatchFormat.DOUBLES)
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
