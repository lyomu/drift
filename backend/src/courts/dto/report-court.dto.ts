import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CourtReportReason } from '@prisma/client';

export class ReportCourtDto {
  @IsEnum(CourtReportReason)
  reason: CourtReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
