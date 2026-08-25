import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentMethodType } from '@prisma/client';
import {
  PaymentProvider,
  ProviderPaymentMethodInput,
} from './payment-provider';

@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  async createPaymentMethod(input: ProviderPaymentMethodInput) {
    const brand =
      input.type === PaymentMethodType.CARD
        ? input.brand?.trim() || 'Card'
        : 'Mobile money';
    // 0000 is the deterministic sandbox decline path. It gives the clients a
    // real, provider-specific failure reason and retry state without handling
    // raw payment credentials or coupling the domain to a live gateway.
    const outcome = input.last4 === '0000' ? 'decline' : 'approve';
    return {
      provider: 'SANDBOX',
      token: `sandbox_pm_${outcome}_${randomUUID()}`,
      brand,
      last4: input.last4,
      label: `${brand} ending ${input.last4}`,
    };
  }

  async charge(input: { providerToken: string }) {
    const declined = input.providerToken.includes('_decline_');
    return {
      succeeded: !declined,
      reference: `sandbox_tx_${randomUUID()}`,
      failureReason: declined
        ? 'The sandbox provider declined this payment method. Use another method and retry.'
        : null,
    };
  }
}
