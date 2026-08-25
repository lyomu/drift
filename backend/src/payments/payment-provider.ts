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

export interface PaymentProvider {
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
