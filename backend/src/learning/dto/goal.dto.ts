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
