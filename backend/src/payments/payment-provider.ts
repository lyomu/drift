import { PaymentMethodType } from '@prisma/client';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface ProviderPaymentMethodInput {
  type: PaymentMethodType;
  brand?: string;
  last4: string;
}

export interface ProviderPaymentMethod {
  provider: string;
  token: string;
  brand: string | null;
  last4: string;
  label: string;
}

export interface ProviderChargeResult {
  succeeded: boolean;
  reference: string;
  failureReason: string | null;
}

/**
 * A provider we can charge directly against a stored token, deciding for
 * ourselves when each billing period falls due. The sandbox works this way, and
 * so would a provider we held card credentials for.
 */
export interface DirectPaymentProvider {
  readonly mode: 'direct';
  readonly name: string;
  createPaymentMethod(
    input: ProviderPaymentMethodInput,
  ): Promise<ProviderPaymentMethod>;
  charge(input: {
    providerToken: string;
    amountMinor: number;
    currency: string;
    description: string;
  }): Promise<ProviderChargeResult>;
}

export interface HostedPlanInput {
  name: string;
  amountMinor: number;
  currency: string;
  interval: 'MONTHLY' | 'YEARLY';
}

export interface HostedCustomerInput {
  /** Our billing account id, so a record here can be traced back to one there. */
  reference: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface HostedSubscriptionResult {
  providerReference: string;
  /** Send the payer here. Until they complete it, nothing has been paid. */
  setupUrl: string;
  status: string;
}

/**
 * A provider that owns the payment interaction and the recurring cycle itself.
 * We never see card details, we cannot charge on demand, and we learn what
 * happened from a webhook rather than from the return value of a call.
 *
 * This is a genuinely different shape from {@link DirectPaymentProvider}, not a
 * subset of it, which is why these are two interfaces rather than one with
 * methods that throw for the wrong provider. Callers branch on `mode` and the
 * compiler makes sure they did.
 *
 * The plan and customer calls are separate rather than folded into
 * `startSubscription` because both produce identifiers worth keeping: creating
 * them per checkout would litter the provider with duplicates of the same club
 * and the same plan.
 */
export interface HostedRefundInput {
  /** The provider's own per-charge invoice id, captured from the webhook. */
  providerInvoiceId: string;
  amountMinor: number;
  reason: string;
  reasonDetails?: string | null;
}

export interface HostedPaymentProvider {
  readonly mode: 'hosted';
  readonly name: string;
  /** @returns the provider's plan id, to be stored against our `PaymentPlan`. */
  createPlan(input: HostedPlanInput): Promise<string>;
  /**
   * Push edited terms onto an existing provider plan.
   *
   * Whether mandates already authorised against it reprice is the provider's
   * behaviour, not ours — callers should record that rather than assert it.
   */
  updatePlan(providerPlanId: string, input: HostedPlanInput): Promise<void>;
  /** Move money back. Distinct from marking a row refunded in our own ledger. */
  refund(input: HostedRefundInput): Promise<{ reference: string }>;
  /** @returns the provider's customer id, to be stored on our `BillingAccount`. */
  createCustomer(input: HostedCustomerInput): Promise<string>;
  startSubscription(input: {
    customerId: string;
    planId: string;
    /** Our invoice number, echoed back on the webhook. */
    reference: string;
    returnUrl: string;
  }): Promise<HostedSubscriptionResult>;
  cancelSubscription(providerReference: string): Promise<void>;
}

export type PaymentProvider = DirectPaymentProvider | HostedPaymentProvider;
