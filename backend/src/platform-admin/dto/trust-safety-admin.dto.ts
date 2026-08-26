import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TrustSafetyPriority } from '@prisma/client';

export class ReviewReportedContentDto {
  @IsIn(['START_REVIEW', 'ACTION', 'DISMISS', 'ESCALATE_PRIORITY'])
  action!: 'START_REVIEW' | 'ACTION' | 'DISMISS' | 'ESCALATE_PRIORITY';

  @IsOptional()
  @IsEnum(TrustSafetyPriority)
  priority?: TrustSafetyPriority;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason?: string;
}

export class OpenAbuseCaseDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  summary!: string;

  @IsOptional()
  @IsEnum(TrustSafetyPriority)
  priority?: TrustSafetyPriority;
}

export class CreateAbuseCaseDto extends OpenAbuseCaseDto {
  @IsString()
  subjectUserId!: string;
}

export class UpdateAbuseCaseDto {
  @IsIn(['ADD_NOTE', 'ESCALATE_PRIORITY', 'SUSPEND', 'CLOSE'])
  action!: 'ADD_NOTE' | 'ESCALATE_PRIORITY' | 'SUSPEND' | 'CLOSE';

  @IsOptional()
  @IsEnum(TrustSafetyPriority)
  priority?: TrustSafetyPriority;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason?: string;
}
