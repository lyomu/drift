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
import { AssessmentPillar } from '@prisma/client';

export class LogPracticeSessionDto {
  @Type(() => Date)
  @IsDate()
  occurredAt: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes: number;

  @IsEnum(AssessmentPillar)
  skillFocus: AssessmentPillar;

  @IsOptional()
  @IsString()
  drillId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  perceivedPerformance: number;
}
