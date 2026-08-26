import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentMethodType } from '@prisma/client';
import {
  PaymentProvider,
  ProviderChargeResult,
  ProviderPaymentMethod,
  ProviderPaymentMethodInput,
} from './payment-provider';

@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  createPaymentMethod(
    input: ProviderPaymentMethodInput,
  ): Promise<ProviderPaymentMethod> {
    const brand =
      input.type === PaymentMethodType.CARD
        ? input.brand?.trim() || 'Card'
        : 'Mobile money';
    // 0000 is the deterministic sandbox decline path. It gives the clients a
    // real, provider-specific failure reason and retry state without handling
    // raw payment credentials or coupling the domain to a live gateway.
    const outcome = input.last4 === '0000' ? 'decline' : 'approve';
    return Promise.resolve({
      provider: 'SANDBOX',
      token: `sandbox_pm_${outcome}_${randomUUID()}`,
      brand,
      last4: input.last4,
      label: `${brand} ending ${input.last4}`,
    });
  }

  charge(input: { providerToken: string }): Promise<ProviderChargeResult> {
    const declined = input.providerToken.includes('_decline_');
    return Promise.resolve({
      succeeded: !declined,
      reference: `sandbox_tx_${randomUUID()}`,
      failureReason: declined
        ? 'The sandbox provider declined this payment method. Use another method and retry.'
        : null,
    });
  }
}
