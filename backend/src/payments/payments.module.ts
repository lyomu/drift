import { Module } from '@nestjs/common';
import { ClubBillingController } from './club-billing.controller';
import { PAYMENT_PROVIDER } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

@Module({
  controllers: [PaymentsController, ClubBillingController],
  providers: [
    PaymentsService,
    SandboxPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: SandboxPaymentProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
