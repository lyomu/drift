import { Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';

@Module({
  controllers: [SafetyController],
  providers: [SafetyService],
  // Phase M14's club-admin module is a second consumer, for the Reports
  // moderation queue (CourtReport only — see safety.service.ts).
  exports: [SafetyService],
})
export class SafetyModule {}
