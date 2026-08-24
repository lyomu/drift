import { Module } from '@nestjs/common';
import { PadelController } from './padel.controller';
import { PadelService } from './padel.service';
import { PadelAssessmentService } from './padel-assessment.service';

@Module({
  controllers: [PadelController],
  providers: [PadelService, PadelAssessmentService],
})
export class PadelModule {}
