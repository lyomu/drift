import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PaymentsService } from './payments.service';

function configWith(env: {
  intasendChallenge?: string;
  paddleWebhookSecret?: string;
}): ConfigService {
  return {
    get: (key: string) => {
      if (key === 'INTASEND_WEBHOOK_CHALLENGE') return env.intasendChallenge;
      if (key === 'PADDLE_WEBHOOK_SECRET') return env.paddleWebhookSecret;
      return undefined;
    },
  } as unknown as ConfigService;
}

function paddleRequest(
  body: Record<string, unknown>,
  opts: {
    secret?: string;
    ts?: number;
    signature?: string;
    noSignature?: boolean;
    noRawBody?: boolean;
  } = {},
): RawBodyRequest<Request> {
  const raw = Buffer.from(JSON.stringify(body), 'utf8');
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const h1 =
    opts.signature ??
    createHmac('sha256', opts.secret ?? 'whsec_test')
      .update(`${ts}:${raw.toString('utf8')}`)
      .digest('hex');
  return {
    rawBody: opts.noRawBody ? undefined : raw,
    headers: opts.noSignature
      ? {}
      : { 'paddle-signature': `ts=${ts};h1=${h1}` },
  } as unknown as RawBodyRequest<Request>;
}

/**
 * The webhook is unauthenticated by necessity — neither provider holds a
 * credential of ours. IntaSend's door is a shared challenge string; Paddle's
 * is a real HMAC signature over the raw body. These cover each door, not the
 * bookkeeping behind it.
 */
describe('PaymentWebhooksController', () => {
  let payments: { applyProviderPaymentEvent: jest.Mock };

  beforeEach(() => {
    payments = {
      applyProviderPaymentEvent: jest.fn().mockResolvedValue({ applied: true }),
    };
  });

  const controller = (env: {
    intasendChallenge?: string;
    paddleWebhookSecret?: string;
  }) =>
    new PaymentWebhooksController(
      payments as unknown as PaymentsService,
      configWith(env),
    );

  describe('intasend', () => {
    it('rejects a payload with no challenge', async () => {
      await expect(
        controller({ intasendChallenge: 'shared-secret' }).intasend({
          state: 'COMPLETE',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(payments.applyProviderPaymentEvent).not.toHaveBeenCalled();
    });

    it('rejects a wrong challenge', async () => {
      await expect(
        controller({ intasendChallenge: 'shared-secret' }).intasend({
          state: 'COMPLETE',
          challenge: 'guessed',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(payments.applyProviderPaymentEvent).not.toHaveBeenCalled();
    });

    it('rejects a challenge of the right length but wrong value', async () => {
      // The constant-time compare returns early on a length mismatch, so a
      // same-length value is the case that actually exercises it.
      await expect(
        controller({ intasendChallenge: 'shared-secret' }).intasend({
          state: 'COMPLETE',
          challenge: 'shared-secreT',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects everything when no challenge is configured', async () => {
      // Refusing beats accepting: an unconfigured deployment must not treat
      // any POST to this URL as a confirmed payment.
      await expect(
        controller({}).intasend({ state: 'COMPLETE', challenge: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('applies a verified event, tagged as INTASEND, and reports the fields it maps', async () => {
      const result = await controller({
        intasendChallenge: 'shared-secret',
      }).intasend({
        challenge: 'shared-secret',
        state: 'COMPLETE',
        invoice_id: 'BRZKGPR',
        reference: 'DRF-1',
        subscription_id: 'SUB1',
      });

      expect(result).toEqual({ received: true });
      expect(payments.applyProviderPaymentEvent).toHaveBeenCalledWith(
        'INTASEND',
        {
          state: 'COMPLETE',
          invoiceId: 'BRZKGPR',
          reference: 'DRF-1',
          subscriptionId: 'SUB1',
          failureReason: null,
        },
      );
    });

    it('accepts api_ref where the subscription API would send reference', async () => {
      await controller({ intasendChallenge: 'shared-secret' }).intasend({
        challenge: 'shared-secret',
        state: 'FAILED',
        api_ref: 'DRF-2',
        failed_reason: 'Insufficient funds',
      });

      expect(payments.applyProviderPaymentEvent).toHaveBeenCalledWith(
        'INTASEND',
        expect.objectContaining({
          reference: 'DRF-2',
          failureReason: 'Insufficient funds',
        }),
      );
    });

    it('still answers 200 for an event it could not apply', async () => {
      // IntaSend deactivates an endpoint after repeated failures. Losing every
      // future payment confirmation over one unrecognised event is far worse
      // than ignoring that event.
      payments.applyProviderPaymentEvent.mockResolvedValue({
        applied: false,
        reason: 'no matching invoice',
      });

      await expect(
        controller({ intasendChallenge: 'shared-secret' }).intasend({
          challenge: 'shared-secret',
          state: 'COMPLETE',
          reference: 'unknown',
        }),
      ).resolves.toEqual({ received: true });
    });
  });

  describe('paddle', () => {
    it('rejects everything when no webhook secret is configured', async () => {
      await expect(
        controller({}).paddle(
          paddleRequest({ event_type: 'transaction.completed' }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(payments.applyProviderPaymentEvent).not.toHaveBeenCalled();
    });

    it('rejects a request with no signature header', async () => {
      await expect(
        controller({ paddleWebhookSecret: 'whsec_test' }).paddle(
          paddleRequest(
            { event_type: 'transaction.completed' },
            { noSignature: true },
          ),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong signature', async () => {
      await expect(
        controller({ paddleWebhookSecret: 'whsec_test' }).paddle(
          paddleRequest(
            { event_type: 'transaction.completed' },
            { signature: 'a'.repeat(64) },
          ),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(payments.applyProviderPaymentEvent).not.toHaveBeenCalled();
    });

    it('rejects a stale timestamp, even with a correctly-computed signature', async () => {
      // Guards against replaying a captured, genuinely-signed request.
      await expect(
        controller({ paddleWebhookSecret: 'whsec_test' }).paddle(
          paddleRequest(
            { event_type: 'transaction.completed' },
            { secret: 'whsec_test', ts: Math.floor(Date.now() / 1000) - 3600 },
          ),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('applies a completed transaction, tagged as PADDLE', async () => {
      const result = await controller({
        paddleWebhookSecret: 'whsec_test',
      }).paddle(
        paddleRequest(
          {
            event_type: 'transaction.completed',
            data: {
              id: 'txn_1',
              subscription_id: 'sub_1',
              custom_data: { reference: 'DRF-1' },
            },
          },
          { secret: 'whsec_test' },
        ),
      );

      expect(result).toEqual({ received: true });
      expect(payments.applyProviderPaymentEvent).toHaveBeenCalledWith(
        'PADDLE',
        {
          state: 'COMPLETE',
          invoiceId: 'txn_1',
          reference: 'DRF-1',
          subscriptionId: 'sub_1',
          failureReason: null,
        },
      );
    });

    it('applies a failed payment, tagged as PADDLE', async () => {
      await controller({ paddleWebhookSecret: 'whsec_test' }).paddle(
        paddleRequest(
          {
            event_type: 'transaction.payment_failed',
            data: {
              id: 'txn_2',
              custom_data: { reference: 'DRF-2' },
              origin: 'card_declined',
            },
          },
          { secret: 'whsec_test' },
        ),
      );

      expect(payments.applyProviderPaymentEvent).toHaveBeenCalledWith(
        'PADDLE',
        expect.objectContaining({
          state: 'FAILED',
          reference: 'DRF-2',
          failureReason: 'card_declined',
        }),
      );
    });

    it('accepts but ignores an event type it does not act on', async () => {
      const result = await controller({
        paddleWebhookSecret: 'whsec_test',
      }).paddle(
        paddleRequest(
          { event_type: 'subscription.updated', data: { id: 'sub_1' } },
          { secret: 'whsec_test' },
        ),
      );

      expect(result).toEqual({ received: true });
      expect(payments.applyProviderPaymentEvent).not.toHaveBeenCalled();
    });
  });
});
