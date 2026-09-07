import { Module } from '@nestjs/common';
import { ClubBillingController } from './club-billing.controller';
import { IntasendPaymentProvider } from './intasend-payment.provider';
import { PaddlePaymentProvider } from './paddle-payment.provider';
import { PaymentProviderResolver } from './payment-provider.resolver';
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
    PaddlePaymentProvider,
    // Which provider bills a given plan is a currency question now that two
    // hosted providers can be configured at once — resolved per checkout by
    // `PaymentProviderResolver` rather than picked once at boot. A deployment
    // with no real keys at all keeps routing everything to the sandbox, which
    // is what lets dev machines and CI run the whole billing surface with no
    // credentials.
    PaymentProviderResolver,
  ],
  // Platform Admin needs the same provider seam: repricing a plan, refunding a
  // charge and cancelling a mandate are all provider calls, and doing them
  // against a second copy of the wiring is how the two consoles drift apart.
  exports: [PaymentsService, ProviderPlanService, PaymentProviderResolver],
})
export class PaymentsModule {}
