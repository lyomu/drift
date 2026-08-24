import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  AssessmentBranch,
  AssessmentPillar,
  LearningContentType,
} from '@prisma/client';

export class SearchContentDto {
  @IsOptional()
  @IsEnum(LearningContentType)
  type?: LearningContentType;

  @IsOptional()
  @IsEnum(AssessmentPillar)
  targetSkill?: AssessmentPillar;

  @IsOptional()
  @IsEnum(AssessmentBranch)
  branch?: AssessmentBranch;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}
