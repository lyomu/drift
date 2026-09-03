import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PaymentsService } from './payments.service';

function configWith(challenge?: string): ConfigService {
  return {
    get: (key: string) =>
      key === 'INTASEND_WEBHOOK_CHALLENGE' ? challenge : undefined,
  } as unknown as ConfigService;
}

/**
 * The webhook is unauthenticated by necessity — the provider holds no
 * credential of ours — so the shared challenge is the whole of the door. These
 * cover the door, not the bookkeeping behind it.
 */
describe('PaymentWebhooksController', () => {
  let payments: { applyProviderPaymentEvent: jest.Mock };

  beforeEach(() => {
    payments = {
      applyProviderPaymentEvent: jest.fn().mockResolvedValue({ applied: true }),
    };
  });

  const controller = (challenge?: string) =>
    new PaymentWebhooksController(
      payments as unknown as PaymentsService,
      configWith(challenge),
    );

  it('rejects a payload with no challenge', async () => {
    await expect(
      controller('shared-secret').intasend({ state: 'COMPLETE' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(payments.applyProviderPaymentEvent).not.toHaveBeenCalled();
  });

  it('rejects a wrong challenge', async () => {
    await expect(
      controller('shared-secret').intasend({
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
      controller('shared-secret').intasend({
        state: 'COMPLETE',
        challenge: 'shared-secreT',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects everything when no challenge is configured', async () => {
    // Refusing beats accepting: an unconfigured deployment must not treat any
    // POST to this URL as a confirmed payment.
    await expect(
      controller(undefined).intasend({ state: 'COMPLETE', challenge: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('applies a verified event and reports the fields it maps', async () => {
    const result = await controller('shared-secret').intasend({
      challenge: 'shared-secret',
      state: 'COMPLETE',
      invoice_id: 'BRZKGPR',
      reference: 'DRF-1',
      subscription_id: 'SUB1',
    });

    expect(result).toEqual({ received: true });
    expect(payments.applyProviderPaymentEvent).toHaveBeenCalledWith({
      state: 'COMPLETE',
      invoiceId: 'BRZKGPR',
      reference: 'DRF-1',
      subscriptionId: 'SUB1',
      failureReason: null,
    });
  });

  it('accepts api_ref where the subscription API would send reference', async () => {
    await controller('shared-secret').intasend({
      challenge: 'shared-secret',
      state: 'FAILED',
      api_ref: 'DRF-2',
      failed_reason: 'Insufficient funds',
    });

    expect(payments.applyProviderPaymentEvent).toHaveBeenCalledWith(
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
      controller('shared-secret').intasend({
        challenge: 'shared-secret',
        state: 'COMPLETE',
        reference: 'unknown',
      }),
    ).resolves.toEqual({ received: true });
  });
});
