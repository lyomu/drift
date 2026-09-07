import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaddlePaymentProvider } from './paddle-payment.provider';

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

describe('PaddlePaymentProvider', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('environment selection', () => {
    // Unlike IntaSend's key prefix, a Paddle key does not self-identify its
    // environment — PADDLE_ENVIRONMENT is the explicit switch instead.
    it('defaults to the sandbox host when PADDLE_ENVIRONMENT is unset', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'ctm_1' } }));

      await provider.createCustomer({
        reference: 'acct-1',
        email: 'a@example.com',
      });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://sandbox-api.paddle.com/customers',
      );
    });

    it('uses the production host when PADDLE_ENVIRONMENT=production', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({
          PADDLE_API_KEY: 'pdl_apikey_abc',
          PADDLE_ENVIRONMENT: 'production',
        }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'ctm_1' } }));

      await provider.createCustomer({
        reference: 'acct-1',
        email: 'a@example.com',
      });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.paddle.com/customers',
      );
    });

    it('is disabled, and refuses to call out, with no key', async () => {
      const provider = new PaddlePaymentProvider(configWith({}));

      expect(provider.enabled).toBe(false);
      await expect(
        provider.createCustomer({ reference: 'a', email: 'b@example.com' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('createPlan', () => {
    it('creates a product, then a price under it, sending minor units as-is', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pro_1' } }))
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pri_1' } }));

      const planId = await provider.createPlan({
        name: 'Club Pro',
        amountMinor: 2900,
        currency: 'USD',
        interval: 'MONTHLY',
      });

      expect(planId).toBe('pri_1');
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://sandbox-api.paddle.com/products',
      );
      expect(fetchMock.mock.calls[1][0]).toBe(
        'https://sandbox-api.paddle.com/prices',
      );
      const priceBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
      // Paddle wants minor units directly — 2900 stays 2900, unlike
      // IntaSend's major-unit decimal string.
      expect(priceBody.unit_price.amount).toBe('2900');
      expect(priceBody.unit_price.currency_code).toBe('USD');
      expect(priceBody.product_id).toBe('pro_1');
      expect(priceBody.billing_cycle).toEqual({
        frequency: 1,
        interval: 'month',
      });
    });

    it('maps a yearly interval to the year billing cycle', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pro_1' } }))
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pri_1' } }));

      await provider.createPlan({
        name: 'Club Elite',
        amountMinor: 100,
        currency: 'USD',
        interval: 'YEARLY',
      });

      const priceBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
      expect(priceBody.billing_cycle).toEqual({
        frequency: 1,
        interval: 'year',
      });
    });

    it('authenticates with the API key as a bearer token', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pro_1' } }))
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pri_1' } }));

      await provider.createPlan({
        name: 'p',
        amountMinor: 100,
        currency: 'USD',
        interval: 'MONTHLY',
      });

      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        'Bearer pdl_apikey_abc',
      );
    });
  });

  describe('updatePlan', () => {
    it('edits the price in place and keeps the same id when Paddle accepts it', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'pri_1' } }));

      const id = await provider.updatePlan('pri_1', {
        name: 'Club Pro',
        amountMinor: 3500,
        currency: 'USD',
        interval: 'MONTHLY',
      });

      expect(id).toBe('pri_1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://sandbox-api.paddle.com/prices/pri_1',
      );
    });

    it('mints a replacement price and archives the old one when the in-place edit is refused', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock
        // PATCH in place fails
        .mockResolvedValueOnce(jsonResponse({ error: 'immutable' }, 400))
        // GET existing price, for its product id
        .mockResolvedValueOnce(jsonResponse({ data: { product_id: 'pro_1' } }))
        // POST new price
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pri_2' } }))
        // PATCH archive old price
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pri_1' } }));

      const id = await provider.updatePlan('pri_1', {
        name: 'Club Pro',
        amountMinor: 3500,
        currency: 'USD',
        interval: 'MONTHLY',
      });

      expect(id).toBe('pri_2');
      expect(fetchMock).toHaveBeenCalledTimes(4);
      const newPriceBody = JSON.parse(
        fetchMock.mock.calls[2][1].body as string,
      );
      expect(newPriceBody.product_id).toBe('pro_1');
      expect(newPriceBody.unit_price.amount).toBe('3500');
      const archiveBody = JSON.parse(fetchMock.mock.calls[3][1].body as string);
      expect(archiveBody.status).toBe('archived');
    });

    it('still returns the new price id even if archiving the old one fails', async () => {
      // The reprice already succeeded — a failure to tidy up the old price
      // must not undo it or hide the new id from the caller.
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ error: 'immutable' }, 400))
        .mockResolvedValueOnce(jsonResponse({ data: { product_id: 'pro_1' } }))
        .mockResolvedValueOnce(jsonResponse({ data: { id: 'pri_2' } }))
        .mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 500));

      await expect(
        provider.updatePlan('pri_1', {
          name: 'Club Pro',
          amountMinor: 3500,
          currency: 'USD',
          interval: 'MONTHLY',
        }),
      ).resolves.toBe('pri_2');
    });
  });

  describe('startSubscription', () => {
    const provider = () =>
      new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );

    it('returns the checkout link the payer must be sent to', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: {
            id: 'txn_1',
            status: 'ready',
            checkout: { url: 'https://checkout.paddle.com/txn_1' },
          },
        }),
      );

      const result = await provider().startSubscription({
        customerId: 'ctm_1',
        planId: 'pri_1',
        reference: 'DRF-1',
        returnUrl: 'https://drift.einsbrand.com/billing',
      });

      expect(result.providerReference).toBe('txn_1');
      expect(result.setupUrl).toBe('https://checkout.paddle.com/txn_1');
    });

    it('fails loudly when no checkout link comes back', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ data: { id: 'txn_1', status: 'ready' } }),
      );

      await expect(
        provider().startSubscription({
          customerId: 'ctm_1',
          planId: 'pri_1',
          reference: 'DRF-1',
          returnUrl: 'https://drift.einsbrand.com/billing',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('treats a network failure as a failure, never as a success', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));

      await expect(
        provider().startSubscription({
          customerId: 'ctm_1',
          planId: 'pri_1',
          reference: 'DRF-1',
          returnUrl: 'https://drift.einsbrand.com/billing',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('treats a non-2xx response as a failure', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'nope' }, 400));

      await expect(
        provider().startSubscription({
          customerId: 'ctm_1',
          planId: 'pri_1',
          reference: 'DRF-1',
          returnUrl: 'https://drift.einsbrand.com/billing',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('cancelSubscription', () => {
    it('posts to the cancel path for that subscription', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock.mockResolvedValue(
        jsonResponse({ data: { status: 'canceled' } }),
      );

      await provider.cancelSubscription('sub_1');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://sandbox-api.paddle.com/subscriptions/sub_1/cancel',
      );
    });
  });

  describe('refund', () => {
    it('files an adjustment against the transaction', async () => {
      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'adj_1' } }));

      const result = await provider.refund({
        providerInvoiceId: 'txn_1',
        amountMinor: 2900,
        reason: 'Duplicate charge',
      });

      expect(result).toEqual({ reference: 'adj_1' });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.action).toBe('refund');
      expect(body.transaction_id).toBe('txn_1');
    });
  });

  describe('logging', () => {
    // An upstream error message or error body is not ours to trust. If the
    // gateway echoes the request back, an unredacted log line writes the key
    // somewhere it long outlives the request that produced it.
    it('redacts the API key out of a logged upstream failure', async () => {
      const errors: string[] = [];
      const spy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation((message: unknown) => {
          errors.push(String(message));
        });

      const provider = new PaddlePaymentProvider(
        configWith({ PADDLE_API_KEY: 'pdl_apikey_abc' }),
      );
      fetchMock.mockRejectedValue(
        new Error('rejected request with pdl_apikey_abc'),
      );

      await expect(
        provider.createCustomer({ reference: 'a', email: 'b@example.com' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(errors.join('\n')).not.toContain('pdl_apikey_abc');
      expect(errors.join('\n')).toContain('pdl_apikey_[redacted]');
      spy.mockRestore();
    });
  });
});
