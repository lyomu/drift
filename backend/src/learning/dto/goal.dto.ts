import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AssessmentPillar } from '@prisma/client';

export class CreateGoalDto {
  @IsEnum(AssessmentPillar)
  skill: AssessmentPillar;

  /** Optional sub-focus code within the skill, e.g. CONSISTENCY. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  focus?: string;

  /** Player-adjusted starting rating; falls back to the computed score. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(6)
  baseline?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(6)
  target: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  milestones?: string[];
}

export class UpdateGoalDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(6)
  target?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;
}
