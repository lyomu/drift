export type AnalyticsPeriod = { from: string; to: string };

export type OverviewReport = {
  period: AnalyticsPeriod;
  metrics: {
    players: number;
    activePlayers: number;
    newPlayers: number;
    onboardingCompletions: number;
    finishedMatches: number;
    activeSubscriptions: number;
    revenue: { currency: string; amountMinor: number; transactions: number }[];
  };
};

export type MarketReport = {
  period: AnalyticsPeriod;
  dimension: string;
  markets: {
    name: string;
    players: number;
    activePlayers: number;
    newPlayers: number;
    onboardingRate: number;
    matches: number;
    completedMatches: number;
  }[];
};

export type GrowthStep = {
  name: string;
  count: number;
  conversionRate: number;
  definition: string;
};

export type GrowthReport = {
  period: AnalyticsPeriod;
  bucketUnit: "day" | "week" | "month";
  coverage: string;
  series: {
    key: string;
    registrations: number;
    onboardingCompletions: number;
    challenges: number;
    completedMatches: number;
  }[];
  funnels: { id: string; name: string; steps: GrowthStep[] }[];
  cohorts: {
    cohort: string;
    registered: number;
    onboarded: number;
    playedMatch: number;
    onboardingRate: number;
    matchActivationRate: number;
  }[];
};

export type RevenueReport = {
  period: AnalyticsPeriod;
  bucketUnit: "day" | "week" | "month";
  currencies: {
    currency: string;
    collectedMinor: number;
    refundedMinor: number;
    failedMinor: number;
    transactions: number;
  }[];
  sources: {
    source: string;
    audience: string;
    currency: string;
    collectedMinor: number;
    refundedMinor: number;
    transactions: number;
  }[];
  trend: {
    key: string;
    currency: string;
    collectedMinor: number;
    refundedMinor: number;
  }[];
  invoiceStates: Record<string, number>;
  subscriptionStates: Record<string, number>;
  transactions: {
    id: string;
    invoiceNumber: string;
    description: string;
    source: string;
    audience: string;
    provider: string;
    providerReference: string;
    amountMinor: number;
    currency: string;
    status: string;
    failureReason: string | null;
    createdAt: string;
  }[];
};

export type HealthReport = {
  checkedAt: string;
  overallStatus: "HEALTHY" | "DEGRADED" | "DOWN";
  services: {
    key: string;
    name: string;
    status: "HEALTHY" | "DEGRADED" | "DOWN";
    latencyMs: number | null;
    errorRate: number | null;
    detail: string;
    acknowledgement: { at: string; by: string } | null;
  }[];
};
