export type BillingAudience = "PLAYER" | "CLUB";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type BillingSubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED";
export type InvoiceStatus = "OPEN" | "PAID" | "FAILED" | "VOID";
export type PaymentTransactionStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type PromotionDiscountType = "PERCENT" | "AMOUNT";
export type PromotionState = "ACTIVE" | "EXPIRED";
export type SponsorPlacementState = "ACTIVE" | "SCHEDULED" | "ENDED";

export type CommercialPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  audience: BillingAudience;
  priceMinor: number;
  currency: string;
  interval: BillingInterval;
  entitlements: string[];
  isActive: boolean;
  isTest: boolean;
  sortOrder: number;
  subscriptionCounts: Partial<Record<BillingSubscriptionStatus, number>>;
};

export type PlansResponse = { plans: CommercialPlan[] };

/**
 * Served by `GET platform-admin/commercial/currencies`. The list is owned by
 * the backend (`supported-currencies.ts`) — the same one the plan and
 * promotion DTOs validate against — so the dropdown can never offer a code the
 * API would reject.
 */
export type SupportedCurrency = {
  code: string;
  name: string;
  minorUnits: number;
};

export type CurrenciesResponse = { currencies: SupportedCurrency[] };

export type CommercialTransaction = {
  id: string;
  amountMinor: number;
  currency: string;
  status: PaymentTransactionStatus;
  provider: string;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: string;
  paymentMethodLabel: string;
  owner: {
    type: "PLAYER" | "CLUB" | "UNKNOWN";
    id: string | null;
    name: string;
    email: string | null;
  };
  invoice: {
    id: string;
    number: string;
    status: InvoiceStatus;
    description: string | null;
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    plan: {
      id: string;
      name: string;
      audience: BillingAudience;
    };
  };
};

export type PaymentTotalsByCurrency = {
  currency: string;
  collectedMinor: number;
  refundedMinor: number;
  failedMinor: number;
  transactions: number;
};

export type PaymentsResponse = {
  total: number;
  totalsByCurrency: PaymentTotalsByCurrency[];
  transactions: CommercialTransaction[];
};

export type PaymentDetailResponse = { transaction: CommercialTransaction };

export type Promotion = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  audience: BillingAudience | null;
  discountType: PromotionDiscountType;
  percentOff: number | null;
  amountOffMinor: number | null;
  currency: string | null;
  startsAt: string;
  endsAt: string | null;
  maxRedemptions: number | null;
  isActive: boolean;
  state: PromotionState;
};

export type PromotionsResponse = { promotions: Promotion[] };

export type SponsorPlacement = {
  id: string;
  name: string;
  sponsorName: string;
  placementKey: string;
  destinationUrl: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  deactivatedAt: string | null;
  state: SponsorPlacementState;
};

export type SponsorPlacementsResponse = { placements: SponsorPlacement[] };

export function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Any";
}

export function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
}

export function dateLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "n/a";
}

export function dateTimeLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "n/a";
}
