import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import {
  AssessmentBranch,
  AssessmentPillar,
  LearningContentStatus,
  MatchSport,
} from '@prisma/client';

export class UpsertLearningContentDto {
  @IsEnum(MatchSport)
  sport!: MatchSport;

  @IsEnum(AssessmentPillar)
  targetSkill!: AssessmentPillar;

  @IsOptional()
  @IsEnum(AssessmentBranch)
  branch?: AssessmentBranch | null;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  bodyText?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  videoUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes?: number | null;

  @IsEnum(LearningContentStatus)
  status!: LearningContentStatus;
}

export class UpsertLearningPathDto extends UpsertLearningContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pathGoal?: string | null;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  stepIds!: string[];
}
