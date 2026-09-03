import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PaymentsService } from './payments.service';

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Inbound payment confirmations.
 *
 * Unauthenticated by necessity — the provider has no credential of ours — so
 * the shared challenge is the only thing separating a real confirmation from
 * anyone who can guess the URL. It is compared in constant time and never
 * logged.
 *
 * The body is typed as a plain object rather than a DTO class on purpose: the
 * global ValidationPipe runs with `forbidNonWhitelisted: true`, so a DTO would
 * reject the provider's payload outright for carrying fields we do not model,
 * and the rejection would look like a provider outage.
 */
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  private readonly logger = new Logger(PaymentWebhooksController.name);
  private readonly challenge: string | null;

  constructor(
    private readonly payments: PaymentsService,
    config: ConfigService,
  ) {
    this.challenge = config.get<string>('INTASEND_WEBHOOK_CHALLENGE') ?? null;
  }

  @Post('intasend')
  // 200 for anything we authenticated, including events we do not act on.
  // IntaSend deactivates an endpoint after repeated failures, and losing
  // delivery for every future payment because of one unrecognised event type
  // is a far worse outcome than ignoring it.
  @HttpCode(HttpStatus.OK)
  async intasend(@Body() body: Record<string, unknown>) {
    if (!this.challenge) {
      this.logger.error(
        'IntaSend webhook received but INTASEND_WEBHOOK_CHALLENGE is not configured; ignoring.',
      );
      throw new UnauthorizedException();
    }

    const presented = readString(body ?? {}, 'challenge');
    if (!presented || !this.matchesChallenge(presented)) {
      this.logger.warn('IntaSend webhook rejected: challenge did not match.');
      throw new UnauthorizedException();
    }

    const state = readString(body, 'state');
    const result = await this.payments.applyProviderPaymentEvent({
      state,
      invoiceId: readString(body, 'invoice_id'),
      // `reference` is what the subscription API echoes back; `api_ref` is the
      // equivalent on one-off collections. Accept either rather than depending
      // on which product surface sent the event.
      reference: readString(body, 'reference') ?? readString(body, 'api_ref'),
      subscriptionId: readString(body, 'subscription_id'),
      failureReason: readString(body, 'failed_reason'),
    });

    if (!result.applied) {
      this.logger.log(
        `IntaSend webhook accepted but not applied (${result.reason ?? 'unknown'}).`,
      );
    }
    return { received: true };
  }

  private matchesChallenge(presented: string): boolean {
    const expected = Buffer.from(this.challenge ?? '', 'utf8');
    const actual = Buffer.from(presented, 'utf8');
    // timingSafeEqual throws on a length mismatch, which would itself leak the
    // expected length through the error path, so compare lengths first and
    // still run the constant-time compare on the equal-length case.
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }
}
