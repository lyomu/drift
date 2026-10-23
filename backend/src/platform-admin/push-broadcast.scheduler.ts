import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PushBroadcastAdminService } from './push-broadcast-admin.service';

@Injectable()
export class PushBroadcastScheduler {
  private readonly logger = new Logger(PushBroadcastScheduler.name);
  constructor(private readonly broadcasts: PushBroadcastAdminService) {}

  @Cron('*/1 * * * *')
  async sendDue(): Promise<void> {
    for (const id of await this.broadcasts.claimDue()) {
      try {
        await this.broadcasts.deliver(id);
      } catch (error) {
        this.logger.error(
          `Scheduled broadcast ${id} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
