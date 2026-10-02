import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { CoachApplicationStatus } from '@prisma/client';
import { CoachFieldsDto } from './coach-admin.dto';

/**
 * Every field optional: the coach saves a partial draft as they go, and the
 * completeness check happens once, at submit. Same shape as the club-admin
 * coach form so the two write identical profiles.
 */
export class SaveCoachApplicationDto extends CoachFieldsDto {}

/** The subset of statuses a reviewer may move an application to. */
export enum CoachApplicationDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
}

export class ReviewCoachApplicationDto {
  @IsEnum(CoachApplicationDecision)
  decision: CoachApplicationDecision;

  /**
   * Shown to the coach verbatim. Required for anything other than an approval,
   * because "rejected, no reason given" is not a reviewable decision and the
   * coach has no other way to learn what to fix.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class ListCoachApplicationsDto {
  @IsOptional()
  @IsEnum(CoachApplicationStatus)
  status?: CoachApplicationStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
