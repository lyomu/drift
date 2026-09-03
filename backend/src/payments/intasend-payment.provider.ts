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

/** IntaSend expects a major-unit decimal string, not minor units. */
function majorUnits(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

/**
 * Strip anything key-shaped out of text on its way to a log.
 *
 * Upstream error messages and error bodies are not ours to trust: a gateway
 * that echoes the request, or a client that puts the URL and headers in the
 * exception, would otherwise write the secret key into the application log
 * where it long outlives the request.
 */
function redact(text: string): string {
  return text.replace(/(ISSecretKey|ISPubKey)_\S+/g, '$1_[redacted]');
}

const INTERVAL_UNIT: Record<HostedPlanInput['interval'], string> = {
  MONTHLY: 'M',
  YEARLY: 'Y',
};

/**
 * Club billing through IntaSend (M-Pesa, card and bank, KES/USD/EUR/GBP).
 *
 * Configured entirely from env and **disabled when `INTASEND_SECRET_KEY` is
 * absent**, which is the same idiom `MailerService` and `PushService` use: an
 * unconfigured deployment keeps its previous behaviour rather than failing at
 * startup, so nothing here can break a dev machine or CI.
 *
 * Unlike those two, calls here **do** throw when the provider is unreachable.
 * A failed mail send must not take down login, but a failed payment call must
 * never be mistaken for a successful one — the club would be told it had
 * subscribed when no money moved.
 */
@Injectable()
export class IntasendPaymentProvider implements HostedPaymentProvider {
  readonly mode = 'hosted' as const;
  readonly name = 'INTASEND';

  private readonly logger = new Logger(IntasendPaymentProvider.name);
  private readonly secretKey: string | null;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('INTASEND_SECRET_KEY') ?? null;

    // Derive the host from the key prefix rather than configuring it
    // separately. Two env vars that must agree is a way to point a test key at
    // the live gateway — or worse, a live key at a test run — by editing only
    // one of them. An explicit override stays available for a proxy.
    const configured = config.get<string>('INTASEND_BASE_URL');
    const live = this.secretKey?.includes('_live_') ?? false;
    this.baseUrl = (
      configured ??
      (live ? 'https://payment.intasend.com' : 'https://sandbox.intasend.com')
    ).replace(/\/+$/, '');

    if (!this.secretKey) {
      this.logger.log(
        'INTASEND_SECRET_KEY is not set — club billing runs on the sandbox provider.',
      );
      return;
    }
    this.logger.log(
      `IntaSend configured against ${this.baseUrl} (${live ? 'LIVE' : 'test'} key).`,
    );
    if (live && process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        `A LIVE IntaSend key is configured outside production (NODE_ENV=${
          process.env.NODE_ENV ?? 'undefined'
        }). Payments made here move real money.`,
      );
    }
  }

  get enabled(): boolean {
    return this.secretKey !== null;
  }

  async createPlan(input: HostedPlanInput): Promise<string> {
    const body = await this.request<{ plan_id: string }>(
      'POST',
      '/api/v1/subscriptions-plans/',
      {
        name: input.name,
        currency: input.currency,
        amount: majorUnits(input.amountMinor),
        frequency: 1,
        frequency_unit: INTERVAL_UNIT[input.interval],
        // Omitted deliberately: with no billing_cycles the plan renews until
        // cancelled, which is what a subscription means here. A fixed count
        // would silently stop billing an active club after N periods.
      },
    );
    return body.plan_id;
  }

  async updatePlan(
    providerPlanId: string,
    input: HostedPlanInput,
  ): Promise<void> {
    await this.request(
      'PUT',
      `/api/v1/subscriptions-plans/${encodeURIComponent(providerPlanId)}/`,
      {
        name: input.name,
        currency: input.currency,
        amount: majorUnits(input.amountMinor),
        frequency: 1,
        frequency_unit: INTERVAL_UNIT[input.interval],
      },
    );
  }

  async refund(input: HostedRefundInput): Promise<{ reference: string }> {
    // IntaSend files refunds through the chargebacks resource. The prose docs
    // name the field `invoice`; the OpenAPI schema for this endpoint names it
    // `invoice_id`, and the schema is what the endpoint validates against — if
    // this ever starts 400ing on a missing field, that discrepancy is the first
    // place to look.
    const body = await this.request<{ invoice_id?: string }>(
      'POST',
      '/api/v1/chargebacks/',
      {
        invoice_id: input.providerInvoiceId,
        amount: majorUnits(input.amountMinor),
        reason: input.reason,
        ...(input.reasonDetails
          ? { reason_details: input.reasonDetails }
          : {}),
      },
    );
    return { reference: body.invoice_id ?? input.providerInvoiceId };
  }

  async createCustomer(input: HostedCustomerInput): Promise<string> {
    const body = await this.request<{ customer_id: string }>(
      'POST',
      '/api/v1/subscriptions-customers/',
      {
        email: input.email,
        first_name: input.firstName ?? '',
        last_name: input.lastName ?? '',
        reference: input.reference,
      },
    );
    return body.customer_id;
  }

  async startSubscription(input: {
    customerId: string;
    planId: string;
    reference: string;
    returnUrl: string;
  }): Promise<HostedSubscriptionResult> {
    const body = await this.request<{
      subscription_id: string;
      setup_url: string;
      status: string;
    }>('POST', '/api/v1/subscriptions/', {
      customer_id: input.customerId,
      plan_id: input.planId,
      reference: input.reference,
      start_date: new Date().toISOString().slice(0, 10),
      redirect_url: input.returnUrl,
    });

    if (!body.setup_url) {
      // Without this the caller stores an "active" subscription and redirects
      // the club to `undefined`. Fail loudly instead.
      throw new ServiceUnavailableException(
        'The payment provider did not return a setup link. No charge was made.',
      );
    }
    return {
      providerReference: body.subscription_id,
      setupUrl: body.setup_url,
      status: body.status,
    };
  }

  async cancelSubscription(providerReference: string): Promise<void> {
    await this.request(
      'POST',
      `/api/v1/subscriptions/${encodeURIComponent(providerReference)}/unsubscribe/`,
      {},
    );
  }

  private async request<T>(
    method: 'POST' | 'PUT',
    path: string,
    payload: unknown,
  ): Promise<T> {
    if (!this.secretKey) {
      throw new ServiceUnavailableException(
        'Payments are not configured on this deployment.',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(
        `IntaSend ${path} failed: ${redact((error as Error).message)}`,
      );
      throw new ServiceUnavailableException(
        'Could not reach the payment provider. No charge was made.',
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(
        `IntaSend ${path} returned ${response.status}: ${redact(detail).slice(0, 500)}`,
      );
      throw new ServiceUnavailableException(
        'The payment provider rejected the request. No charge was made.',
      );
    }

    return (await response.json()) as T;
  }
}
