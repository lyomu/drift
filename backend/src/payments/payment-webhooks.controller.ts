import {
  BadRequestException,
  Controller,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

function readString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Constant-time string compare. `timingSafeEqual` throws on a length
 * mismatch, which would itself leak the expected length through the error
 * path, so lengths are checked first and the constant-time compare only runs
 * on the equal-length case. */
function timingSafeStringsEqual(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(actual, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

const PADDLE_TIMESTAMP_TOLERANCE_SECONDS = 5;

/**
 * Inbound payment confirmations from both hosted providers.
 *
 * IntaSend and Paddle authenticate very differently — a shared challenge
 * string versus an HMAC signature over the raw body — so each gets its own
 * handler, but both funnel into the same `PaymentsService.applyProviderPaymentEvent`,
 * tagged with which provider sent them.
 */
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  private readonly logger = new Logger(PaymentWebhooksController.name);
  private readonly intasendChallenge: string | null;
  private readonly paddleWebhookSecret: string | null;

  constructor(
    private readonly payments: PaymentsService,
    config: ConfigService,
  ) {
    this.intasendChallenge =
      config.get<string>('INTASEND_WEBHOOK_CHALLENGE') ?? null;
    this.paddleWebhookSecret =
      config.get<string>('PADDLE_WEBHOOK_SECRET') ?? null;
  }

  /**
   * Unauthenticated by necessity — the provider has no credential of ours —
   * so the shared challenge is the only thing separating a real confirmation
   * from anyone who can guess the URL. It is compared in constant time and
   * never logged.
   *
   * The body is typed as a plain object rather than a DTO class on purpose:
   * the global ValidationPipe runs with `forbidNonWhitelisted: true`, so a DTO
   * would reject the provider's payload outright for carrying fields we do
   * not model, and the rejection would look like a provider outage.
   */
  @Post('intasend')
  // 200 for anything we authenticated, including events we do not act on.
  // IntaSend deactivates an endpoint after repeated failures, and losing
  // delivery for every future payment because of one unrecognised event type
  // is a far worse outcome than ignoring it.
  @HttpCode(HttpStatus.OK)
  async intasend(@Body() body: Record<string, unknown>) {
    if (!this.intasendChallenge) {
      this.logger.error(
        'IntaSend webhook received but INTASEND_WEBHOOK_CHALLENGE is not configured; ignoring.',
      );
      throw new UnauthorizedException();
    }

    const presented = readString(body ?? {}, 'challenge');
    if (
      !presented ||
      !timingSafeStringsEqual(this.intasendChallenge, presented)
    ) {
      this.logger.warn('IntaSend webhook rejected: challenge did not match.');
      throw new UnauthorizedException();
    }

    const state = readString(body, 'state');
    const result = await this.payments.applyProviderPaymentEvent('INTASEND', {
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

  /**
   * Paddle signs with a real HMAC over the raw request body — stronger than
   * IntaSend's shared challenge — so this needs the bytes as sent, not the
   * parsed JSON `@Body()` would hand back. `main.ts` enables
   * `rawBody: true` so `req.rawBody` is available here.
   */
  @Post('paddle')
  @HttpCode(HttpStatus.OK)
  async paddle(@Req() req: RawBodyRequest<Request>) {
    if (!this.paddleWebhookSecret) {
      this.logger.error(
        'Paddle webhook received but PADDLE_WEBHOOK_SECRET is not configured; ignoring.',
      );
      throw new UnauthorizedException();
    }
    if (!req.rawBody) {
      // Should be unreachable once rawBody is enabled app-wide; failing loudly
      // here beats silently trusting an unverifiable payload.
      throw new BadRequestException('Raw body not available.');
    }

    const signatureHeader = req.headers['paddle-signature'];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    if (!signature || !this.verifyPaddleSignature(signature, req.rawBody)) {
      this.logger.warn('Paddle webhook rejected: signature did not match.');
      throw new UnauthorizedException();
    }

    const event = JSON.parse(req.rawBody.toString('utf8')) as {
      event_type?: string;
      data?: {
        id?: string;
        subscription_id?: string;
        status?: string;
        custom_data?: { reference?: string } | null;
        origin?: string;
      };
    };

    const mapped = this.mapPaddleEvent(event);
    if (!mapped) {
      this.logger.log(
        `Paddle webhook accepted but not applied (event ${event.event_type ?? 'unknown'} not billing-relevant).`,
      );
      return { received: true };
    }

    const result = await this.payments.applyProviderPaymentEvent(
      'PADDLE',
      mapped,
    );
    if (!result.applied) {
      this.logger.log(
        `Paddle webhook accepted but not applied (${result.reason ?? 'unknown'}).`,
      );
    }
    return { received: true };
  }

  /** Only the two outcomes we act on; every other Paddle event type (price
   * updates, customer changes, ...) is accepted and ignored, the same way
   * IntaSend's PENDING/PROCESSING states are. */
  private mapPaddleEvent(event: {
    event_type?: string;
    data?: {
      id?: string;
      subscription_id?: string;
      custom_data?: { reference?: string } | null;
      origin?: string;
    };
  }): {
    state: string;
    invoiceId: string | null;
    reference: string | null;
    subscriptionId: string | null;
    failureReason: string | null;
  } | null {
    const data = event.data;
    if (!data) return null;
    if (event.event_type === 'transaction.completed') {
      return {
        state: 'COMPLETE',
        invoiceId: data.id ?? null,
        reference: data.custom_data?.reference ?? null,
        subscriptionId: data.subscription_id ?? null,
        failureReason: null,
      };
    }
    if (event.event_type === 'transaction.payment_failed') {
      return {
        state: 'FAILED',
        invoiceId: data.id ?? null,
        reference: data.custom_data?.reference ?? null,
        subscriptionId: data.subscription_id ?? null,
        failureReason: data.origin ?? 'Payment failed at the provider.',
      };
    }
    return null;
  }

  private verifyPaddleSignature(header: string, rawBody: Buffer): boolean {
    const parts = new Map(
      header.split(';').map((part) => {
        const [key, value] = part.split('=');
        return [key, value] as const;
      }),
    );
    const timestamp = parts.get('ts');
    const providedSignature = parts.get('h1');
    if (!timestamp || !providedSignature) return false;

    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > PADDLE_TIMESTAMP_TOLERANCE_SECONDS) {
      return false;
    }

    const expected = createHmac('sha256', this.paddleWebhookSecret ?? '')
      .update(`${timestamp}:${rawBody.toString('utf8')}`)
      .digest('hex');
    return timingSafeStringsEqual(expected, providedSignature);
  }
}
