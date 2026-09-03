import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClubBillingController } from './club-billing.controller';
import { IntasendPaymentProvider } from './intasend-payment.provider';
import { PAYMENT_PROVIDER } from './payment-provider';
import type { PaymentProvider } from './payment-provider';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ProviderPlanService } from './provider-plan.service';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

@Module({
  controllers: [
    PaymentsController,
    ClubBillingController,
    PaymentWebhooksController,
  ],
  providers: [
    PaymentsService,
    ProviderPlanService,
    SandboxPaymentProvider,
    IntasendPaymentProvider,
    {
      // Which provider is live is an environment question, not a code one: a
      // deployment without an IntaSend key keeps the sandbox behaviour it has
      // today rather than failing, which is what lets dev machines and CI run
      // the whole billing surface with no credentials at all.
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, IntasendPaymentProvider, SandboxPaymentProvider],
      useFactory: (
        config: ConfigService,
        intasend: IntasendPaymentProvider,
        sandbox: SandboxPaymentProvider,
      ): PaymentProvider =>
        config.get<string>('INTASEND_SECRET_KEY') ? intasend : sandbox,
    },
  ],
  // Platform Admin needs the same provider seam: repricing a plan, refunding a
  // charge and cancelling a mandate are all provider calls, and doing them
  // against a second copy of the wiring is how the two consoles drift apart.
  exports: [PaymentsService, ProviderPlanService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
