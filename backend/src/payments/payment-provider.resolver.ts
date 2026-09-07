import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntasendPaymentProvider } from './intasend-payment.provider';
import { PaddlePaymentProvider } from './paddle-payment.provider';
import { SandboxPaymentProvider } from './sandbox-payment.provider';
import type {
  DirectPaymentProvider,
  PaymentProvider,
} from './payment-provider';

/** IntaSend subscriptions bill only in these currencies — verified against its
 * current plan-create/retrieve/update schema. Never USD/EUR/GBP. */
const INTASEND_CURRENCIES = new Set([
  'KES',
  'GHS',
  'NGN',
  'UGX',
  'TZS',
  'XAF',
  'XOF',
]);

/** Paddle can bill in many currencies; wired up for USD only for now — this
 * is the platform's global rail, extending it is a one-line addition here
 * once there's a reason to. */
const PADDLE_CURRENCIES = new Set(['USD']);

/**
 * Which provider bills a given currency, now that two hosted providers can be
 * configured at once. Replaces the single `PAYMENT_PROVIDER` DI token a
 * one-provider deployment used to inject directly.
 *
 * A currency with nowhere real to go falls back to the Sandbox provider only
 * when *nothing* real is configured anywhere — the same "no keys means the
 * whole billing surface behaves as it always did" idiom `IntasendPaymentProvider`
 * used alone. Once any real provider exists, an unroutable currency (`XTS` in
 * production, say) is refused rather than silently charged through the fake
 * sandbox path.
 */
@Injectable()
export class PaymentProviderResolver {
  constructor(
    private readonly intasend: IntasendPaymentProvider,
    private readonly paddle: PaddlePaymentProvider,
    private readonly sandbox: SandboxPaymentProvider,
  ) {}

  /** True once at least one real hosted provider is configured. */
  get liveConfigured(): boolean {
    return this.intasend.enabled || this.paddle.enabled;
  }

  /** The provider for this currency, or `null` if nothing bills it. */
  resolve(currency: string): PaymentProvider | null {
    if (INTASEND_CURRENCIES.has(currency) && this.intasend.enabled) {
      return this.intasend;
    }
    if (PADDLE_CURRENCIES.has(currency) && this.paddle.enabled) {
      return this.paddle;
    }
    if (!this.liveConfigured) return this.sandbox;
    return null;
  }

  /** `resolve()`, or a clear error instead of a plan that dies at checkout. */
  require(currency: string): PaymentProvider {
    const provider = this.resolve(currency);
    if (!provider) {
      throw new ServiceUnavailableException(
        `This plan's currency (${currency}) is not billable on this deployment.`,
      );
    }
    return provider;
  }

  /** Whether this currency routes to a hosted (redirect-and-webhook) provider. */
  isHosted(currency: string): boolean {
    return this.resolve(currency)?.mode === 'hosted';
  }

  /** Look up a provider by the name stored against an existing mandate —
   * cancelling or refunding it has to reach the provider that actually holds
   * it, which may not be the one this currency currently routes to. */
  byName(name: string | null | undefined): PaymentProvider | null {
    if (name === this.intasend.name) return this.intasend;
    if (name === this.paddle.name) return this.paddle;
    if (name === this.sandbox.name) return this.sandbox;
    return null;
  }

  /** The dev/CI direct provider, for the "store a card" path that only ever
   * makes sense when nothing real is configured. Callers must check
   * `liveConfigured` first. */
  directFallback(): DirectPaymentProvider {
    return this.sandbox;
  }
}
