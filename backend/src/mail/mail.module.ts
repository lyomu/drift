import { Global, Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

/**
 * Global so every feature module can inject MailerService without each one
 * importing this module — the mailer is infrastructure, like PrismaService.
 */
@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailModule {}
