import { IsEnum } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
