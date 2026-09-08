import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mail/mailer.service';
import { CreateWaitlistSignupDto } from './dto/create-waitlist-signup.dto';

/**
 * The launch waitlist.
 *
 * Two decisions worth keeping:
 *
 * 1. `join` is an UPSERT and always reports the same result. Answering
 *    "you're already on the list" would leak membership to anyone who can
 *    type an address into a public form, and it gives the person filling it
 *    in nothing useful — they wanted to be on the list, and they are.
 *
 * 2. A failed confirmation email does not fail the signup. The row is the
 *    thing that matters; MailerService already no-ops when SMTP is
 *    unconfigured (every dev environment) and never throws.
 */
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async join(dto: CreateWaitlistSignupDto): Promise<{ ok: true }> {
    const { email, firstName, audience, country, city, level, source } = dto;

    // Only overwrite optional detail when this submission actually carried
    // it: someone who signs up again from a shorter form should not have
    // their city blanked.
    const update = {
      ...(firstName ? { firstName } : {}),
      ...(audience ? { audience } : {}),
      ...(country ? { country } : {}),
      ...(city ? { city } : {}),
      ...(level ? { level } : {}),
      ...(source ? { source } : {}),
    };

    const existing = await this.prisma.waitlistSignup.findUnique({
      where: { email },
      select: { id: true },
    });

    await this.prisma.waitlistSignup.upsert({
      where: { email },
      create: { email, firstName, audience, country, city, level, source },
      update,
    });

    // Only on the first join — re-submitting a form should not re-send mail.
    if (!existing) {
      await this.mailer.sendWaitlistConfirmation(email, firstName);
      this.logger.log(`Waitlist signup recorded (source: ${source ?? 'none'})`);
    }

    return { ok: true };
  }
}
