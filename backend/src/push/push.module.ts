import { Global, Module } from '@nestjs/common';
import { PushService } from './push.service';

/**
 * Global for the same reason `MailModule` is: push is infrastructure, and
 * `NotificationsService` — the one place that sends — shouldn't have to import
 * a module to reach it.
 */
@Global()
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
