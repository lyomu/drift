import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  TennisFactMediaController,
  TennisFactsController,
} from './tennis-facts.controller';
import { TennisFactsService } from './tennis-facts.service';

/** Daily tennis fact — Home's "Today's fact" and its Notification Centre
 * entry. Curation lives in platform-admin (`TennisFactAdminController`). */
@Module({
  imports: [NotificationsModule],
  controllers: [TennisFactsController, TennisFactMediaController],
  providers: [TennisFactsService],
  exports: [TennisFactsService],
})
export class TennisFactsModule {}
