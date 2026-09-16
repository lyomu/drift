import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  HostedCustomerInput,
  HostedPaymentProvider,
  HostedPlanInput,
  HostedRefundInput,
  HostedSubscriptionResult,
} from './payment-provider';

/** Strip anything key-shaped out of text on its way to a log. Same reasoning as
 * `intasend-payment.provider.ts`'s `redact`: an echoed request or a client
 * that puts headers in an exception must not write the secret into a log line
 * that long outlives the request. */
function redact(text: string): string {
  return text.replace(/pdl_(sdk|apikey)_\S+/g, 'pdl_$1_[redacted]');
}

const INTERVAL: Record<HostedPlanInput['interval'], { interval: string }> = {
  MONTHLY: { interval: 'month' },
  YEARLY: { interval: 'year' },
};

/**
 * Club billing through Paddle (card, PayPal; global, USD only for now).
 *
 * Paddle is a merchant of record: it handles the charge, the currency, and
 * sales tax itself, and confirms outcomes over a signed webhook rather than a
 * return value — the same `hosted` shape IntaSend uses, so this sits behind
 * the identical `HostedPaymentProvider` interface and `PaymentProviderResolver`
 * picks between the two per plan currency.
 *
 * Configured entirely from env and disabled when `PADDLE_API_KEY` is absent,
 * mirroring `IntasendPaymentProvider` — an unconfigured deployment simply
 * never routes a currency here.
 */
@Injectable()
export class PaddlePaymentProvider implements HostedPaymentProvider {
  readonly mode = 'hosted' as const;
  readonly name = 'PADDLE';

  private readonly logger = new Logger(PaddlePaymentProvider.name);
  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('PADDLE_API_KEY') ?? null;

    // Unlike IntaSend, a Paddle API key does not self-identify sandbox vs
    // production in its own text — both are opaque tokens minted from
    // separate dashboards. An explicit switch is the honest option here
    // rather than guessing from key shape.
    const live = config.get<string>('PADDLE_ENVIRONMENT') === 'production';
    this.baseUrl = live
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';

    if (!this.apiKey) {
      this.logger.log(
        'PADDLE_API_KEY is not set — USD club billing has no route.',
      );
      return;
    }
    this.logger.log(`Paddle configured against ${this.baseUrl}.`);
    if (live && process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        `PADDLE_ENVIRONMENT=production is configured outside production (NODE_ENV=${
          process.env.NODE_ENV ?? 'undefined'
        }). Payments made here move real money.`,
      );
    }
  }

  get enabled(): boolean {
    return this.apiKey !== null;
  }

  async createPlan(input: HostedPlanInput): Promise<string> {
    const product = await this.request<{ data: { id: string } }>(
      'POST',
      '/products',
      {
        name: input.name,
        tax_category: 'saas',
      },
    );
    const price = await this.request<{ data: { id: string } }>(
      'POST',
      '/prices',
      {
        product_id: product.data.id,
        description: input.name,
        billing_cycle: { frequency: 1, ...INTERVAL[input.interval] },
        // Unlike IntaSend's major-unit decimal string, Paddle's unit_price
        // wants the amount in minor units already — sent as-is, not divided.
        unit_price: {
          amount: String(input.amountMinor),
          currency_code: input.currency,
        },
      },
    );
    return price.data.id;
  }

  async updatePlan(
    providerPlanId: string,
    input: HostedPlanInput,
  ): Promise<string> {
    // Paddle's price-update endpoint accepts a new unit_price in its schema,
    // so try the simple in-place edit first — same shape as IntaSend.
    try {
      await this.request(
        'PATCH',
        `/prices/${encodeURIComponent(providerPlanId)}`,
        {
          description: input.name,
          billing_cycle: { frequency: 1, ...INTERVAL[input.interval] },
          unit_price: {
            amount: String(input.amountMinor),
            currency_code: input.currency,
          },
        },
      );
      return providerPlanId;
    } catch (error) {
      this.logger.warn(
        `Could not update Paddle price ${providerPlanId} in place, minting a replacement: ${redact(
          (error as Error).message,
        )}`,
      );
    }

    // Accepting the field is not the same as honouring it once a price has
    // live subscribers — the documented fallback when the in-place edit is
    // refused is to mint a new price under the same product and archive the
    // old one, which is what a caller now bills against.
    const existing = await this.request<{ data: { product_id: string } }>(
      'GET',
      `/prices/${encodeURIComponent(providerPlanId)}`,
      undefined,
    );
    const price = await this.request<{ data: { id: string } }>(
      'POST',
      '/prices',
      {
        product_id: existing.data.product_id,
        description: input.name,
        billing_cycle: { frequency: 1, ...INTERVAL[input.interval] },
        unit_price: {
          amount: String(input.amountMinor),
          currency_code: input.currency,
        },
      },
    );
    await this.request(
      'PATCH',
      `/prices/${encodeURIComponent(providerPlanId)}`,
      { status: 'archived' },
    ).catch((error) => {
      // Archiving the superseded price is tidiness, not correctness — the new
      // price id is already what gets stored and billed against, so a failure
      // here must not undo the reprice that already succeeded.
      this.logger.warn(
        `Could not archive superseded Paddle price ${providerPlanId}: ${redact(
          (error as Error).message,
        )}`,
      );
    });

    return price.data.id;
  }

  async refund(input: HostedRefundInput): Promise<{ reference: string }> {
    const body = await this.request<{ data: { id: string } }>(
      'POST',
      '/adjustments',
      {
        action: 'refund',
        transaction_id: input.providerInvoiceId,
        reason: input.reasonDetails ?? input.reason,
        items: [{ type: 'full' }],
      },
    );
    return { reference: body.data.id };
  }

  async createCustomer(input: HostedCustomerInput): Promise<string> {
    const name = [input.firstName, input.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ');
    const body = await this.request<{ data: { id: string } }>(
      'POST',
      '/customers',
      {
        email: input.email,
        ...(name ? { name } : {}),
        custom_data: { reference: input.reference },
      },
    );
    return body.data.id;
  }

  async startSubscription(input: {
    customerId: string;
    planId: string;
    reference: string;
    // Deliberately unused. IntaSend takes a per-request redirect target;
    // Paddle's transaction `checkout.url` field means something different —
    // it names an *approved custom checkout domain* to render the payment
    // page on, not where to send the payer afterwards. There is no
    // per-request return URL in this API. Where the payer lands after paying
    // is an account-wide setting in Paddle's dashboard (Checkout > default
    // payment link) — see docs/OWNER_ACTIONS.md.
    returnUrl: string;
  }): Promise<HostedSubscriptionResult> {
    const body = await this.request<{
      data: {
        id: string;
        status: string;
        checkout?: { url?: string };
      };
    }>('POST', '/transactions', {
      items: [{ price_id: input.planId, quantity: 1 }],
      customer_id: input.customerId,
      custom_data: { reference: input.reference },
    });

    if (!body.data.checkout?.url) {
      throw new ServiceUnavailableException(
        'The payment provider did not return a checkout link. No charge was made.',
      );
    }
    return {
      providerReference: body.data.id,
      setupUrl: body.data.checkout.url,
      status: body.data.status,
    };
  }

  async cancelSubscription(providerReference: string): Promise<void> {
    await this.request(
      'POST',
      `/subscriptions/${encodeURIComponent(providerReference)}/cancel`,
      { effective_from: 'immediately' },
    );
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    payload: unknown,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Payments are not configured on this deployment.',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(
        `Paddle ${path} failed: ${redact((error as Error).message)}`,
      );
      throw new ServiceUnavailableException(
        'Could not reach the payment provider. No charge was made.',
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(
        `Paddle ${path} returned ${response.status}: ${redact(detail).slice(0, 500)}`,
      );
      throw new ServiceUnavailableException(
        'The payment provider rejected the request. No charge was made.',
      );
    }

    return (await response.json()) as T;
  }
}
