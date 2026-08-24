import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ExperienceSignal } from '@prisma/client';

export class TennisExperienceDto {
  @IsEnum(ExperienceSignal)
  experienceSignal: ExperienceSignal;

  @IsOptional()
  @IsString()
  selfReportedRatingScale?: string;

  @IsOptional()
  @IsNumber()
  selfReportedRatingValue?: number;
}
