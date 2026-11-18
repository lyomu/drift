import { Module } from '@nestjs/common';
import { CoachAiService } from './coach-ai.service';

@Module({ providers: [CoachAiService], exports: [CoachAiService] })
export class CoachAiModule {}
