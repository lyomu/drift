import { MatchFormat, MatchSport } from '@prisma/client';
import {
  IsEnum,
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
