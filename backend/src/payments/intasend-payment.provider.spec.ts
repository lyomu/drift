import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntasendPaymentProvider } from './intasend-payment.provider';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('IntasendPaymentProvider', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('environment selection', () => {
    // The host is derived from the key rather than configured beside it. Two
    // settings that must agree is how a test key ends up pointed at the live
    // gateway by an edit to only one of them.
    it('sends a test key to the sandbox host', async () => {
      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ customer_id: 'cus_1' }));

      await provider.createCustomer({
        reference: 'acct-1',
        email: 'club@example.com',
      });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://sandbox.intasend.com/api/v1/subscriptions-customers/',
      );
    });

    it('sends a live key to the live host', async () => {
      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_live_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ customer_id: 'cus_1' }));

      await provider.createCustomer({
        reference: 'acct-1',
        email: 'club@example.com',
      });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://payment.intasend.com/api/v1/subscriptions-customers/',
      );
    });

    it('is disabled, and refuses to call out, with no key', async () => {
      const provider = new IntasendPaymentProvider(configWith({}));

      expect(provider.enabled).toBe(false);
      await expect(
        provider.createCustomer({ reference: 'a', email: 'b@example.com' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('createPlan', () => {
    it('converts minor units to the decimal string the API expects', async () => {
      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ plan_id: 'PLAN1' }));

      const planId = await provider.createPlan({
        name: 'Club Pro',
        amountMinor: 250_000,
        currency: 'KES',
        interval: 'MONTHLY',
      });

      expect(planId).toBe('PLAN1');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      // 250000 minor units is 2500.00, not 250000 — sending minor units here
      // would bill a club a hundred times the plan price.
      expect(body.amount).toBe('2500.00');
      expect(body.frequency_unit).toBe('M');
      expect(body.currency).toBe('KES');
    });

    it('maps a yearly interval to the Y frequency unit', async () => {
      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ plan_id: 'PLAN2' }));

      await provider.createPlan({
        name: 'Club Pro',
        amountMinor: 100,
        currency: 'KES',
        interval: 'YEARLY',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.frequency_unit).toBe('Y');
    });

    it('authenticates with the secret key as a bearer token', async () => {
      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ plan_id: 'PLAN3' }));

      await provider.createPlan({
        name: 'p',
        amountMinor: 100,
        currency: 'KES',
        interval: 'MONTHLY',
      });

      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer ISSecretKey_test_abc',
      );
    });
  });

  describe('startSubscription', () => {
    const provider = () =>
      new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );

    it('returns the setup link the payer must be sent to', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          subscription_id: 'SUB1',
          setup_url: 'https://sandbox.intasend.com/setup/SUB1',
          status: 'PENDING',
        }),
      );

      const result = await provider().startSubscription({
        customerId: 'cus_1',
        planId: 'PLAN1',
        reference: 'DRF-1',
        returnUrl: 'https://drift.einsbrand.com/billing',
      });

      expect(result.providerReference).toBe('SUB1');
      expect(result.setupUrl).toBe('https://sandbox.intasend.com/setup/SUB1');
    });

    it('fails loudly when no setup link comes back', async () => {
      // Otherwise the caller stores a subscription and redirects the club to
      // `undefined`, having charged nobody.
      fetchMock.mockResolvedValue(
        jsonResponse({ subscription_id: 'SUB1', status: 'PENDING' }),
      );

      await expect(
        provider().startSubscription({
          customerId: 'cus_1',
          planId: 'PLAN1',
          reference: 'DRF-1',
          returnUrl: 'https://drift.einsbrand.com/billing',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('treats a network failure as a failure, never as a success', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));

      await expect(
        provider().startSubscription({
          customerId: 'cus_1',
          planId: 'PLAN1',
          reference: 'DRF-1',
          returnUrl: 'https://drift.einsbrand.com/billing',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('treats a non-2xx response as a failure', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'nope' }, 400));

      await expect(
        provider().startSubscription({
          customerId: 'cus_1',
          planId: 'PLAN1',
          reference: 'DRF-1',
          returnUrl: 'https://drift.einsbrand.com/billing',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });


    it('keeps the secret key out of the error the caller sees', async () => {
      // The upstream message can echo the request, key included. What reaches
      // the client must not.
      fetchMock.mockRejectedValue(new Error('ISSecretKey_test_abc rejected'));

      await expect(
        provider().startSubscription({
          customerId: 'cus_1',
          planId: 'PLAN1',
          reference: 'DRF-1',
          returnUrl: 'https://drift.einsbrand.com/billing',
        }),
      ).rejects.toThrow('Could not reach the payment provider. No charge was made.');
    });
  });

  describe('cancelSubscription', () => {
    it('posts to the unsubscribe path for that subscription', async () => {
      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ status: 'CANCELED' }));

      await provider.cancelSubscription('SUB1');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://sandbox.intasend.com/api/v1/subscriptions/SUB1/unsubscribe/',
      );
    });
  });

  describe('logging', () => {
    // An upstream error message or error body is not ours to trust. If the
    // gateway echoes the request back, an unredacted log line writes the secret
    // key somewhere it long outlives the request that produced it.
    it('redacts the secret key out of a logged upstream failure', async () => {
      const errors: string[] = [];
      const spy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation((message: unknown) => {
          errors.push(String(message));
        });

      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );
      fetchMock.mockRejectedValue(
        new Error('rejected request with ISSecretKey_test_abc'),
      );

      await expect(
        provider.createCustomer({ reference: 'a', email: 'b@example.com' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(errors.join('\n')).not.toContain('ISSecretKey_test_abc');
      expect(errors.join('\n')).toContain('ISSecretKey_[redacted]');
      spy.mockRestore();
    });

    it('redacts a key echoed in an error response body', async () => {
      const errors: string[] = [];
      const spy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation((message: unknown) => {
          errors.push(String(message));
        });

      const provider = new IntasendPaymentProvider(
        configWith({ INTASEND_SECRET_KEY: 'ISSecretKey_test_abc' }),
      );
      fetchMock.mockResolvedValue(
        jsonResponse({ detail: 'bad key ISSecretKey_test_abc' }, 401),
      );

      await expect(
        provider.createCustomer({ reference: 'a', email: 'b@example.com' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(errors.join('\n')).not.toContain('ISSecretKey_test_abc');
      spy.mockRestore();
    });
  });
});
