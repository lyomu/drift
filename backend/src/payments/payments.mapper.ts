import {
  BillingInvoice,
  BillingSubscription,
  PaymentMethod,
  PaymentPlan,
  PaymentTransaction,
} from '@prisma/client';

export function toPlanDto(plan: PaymentPlan) {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    audience: plan.audience,
    priceMinor: plan.priceMinor,
    currency: plan.currency,
    interval: plan.interval,
    entitlements: plan.entitlements,
    isTest: plan.isTest,
  };
}

export function toPaymentMethodDto(method: PaymentMethod) {
  return {
    id: method.id,
    type: method.type,
    provider: method.provider,
    brand: method.brand,
    last4: method.last4,
    label: method.label,
    isDefault: method.isDefault,
    createdAt: method.createdAt,
  };
}

type SubscriptionWithPlan = BillingSubscription & { plan: PaymentPlan };

export function toSubscriptionDto(subscription: SubscriptionWithPlan) {
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    plan: toPlanDto(subscription.plan),
  };
}

type InvoiceWithRelations = BillingInvoice & {
  plan: PaymentPlan;
  transaction:
    | (PaymentTransaction & { paymentMethod: PaymentMethod | null })
    | null;
};

export function toInvoiceDto(invoice: InvoiceWithRelations) {
  return {
    id: invoice.id,
    number: invoice.number,
    amountMinor: invoice.amountMinor,
    currency: invoice.currency,
    status: invoice.status,
    description: invoice.description,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    paidAt: invoice.paidAt,
    createdAt: invoice.createdAt,
    plan: { id: invoice.plan.id, name: invoice.plan.name },
    transaction: invoice.transaction
      ? {
          status: invoice.transaction.status,
          provider: invoice.transaction.provider,
          providerReference: invoice.transaction.providerReference,
          failureReason: invoice.transaction.failureReason,
          paymentMethodLabel:
            invoice.transaction.paymentMethod?.label ?? 'Removed method',
        }
      : null,
  };
}
