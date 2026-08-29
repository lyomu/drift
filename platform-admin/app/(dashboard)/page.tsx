"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MaterialIcon, RowCard } from "@/components/dashboard-design";
import {
  DateRangeToolbar,
  MetricStrip,
  SectionHeading,
  defaultDateRange,
  formatMoney,
  formatNumber,
  queryForRange,
} from "@/components/analytics";
import { Card, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import type { OverviewReport } from "@/lib/analytics-types";

const initialRange = defaultDateRange();

export default function OverviewPage() {
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [report, setReport] = useState<OverviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(
        await api.get<OverviewReport>(`/analytics/overview?${queryForRange(from, to)}`),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Platform KPIs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const revenue = report?.metrics.revenue ?? [];

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Activation, play, and commercial health across the selected operating window."
      />
      <DateRangeToolbar
        from={from}
        to={to}
        loading={loading}
        onFromChange={setFrom}
        onToChange={setTo}
        onApply={() => void load()}
      />
      <ErrorBanner message={error} />
      {loading && !report && <EmptyState message="Loading platform KPIs..." />}

      {report && (
        <>
          <MetricStrip
            metrics={[
              {
                label: "Player accounts",
                value: formatNumber(report.metrics.players),
                note: `${formatNumber(report.metrics.activePlayers)} currently active`,
              },
              {
                label: "New players",
                value: formatNumber(report.metrics.newPlayers),
                note: "Registered in this period",
              },
              {
                label: "Onboarding completed",
                value: formatNumber(report.metrics.onboardingCompletions),
                note: "Completion timestamp in this period",
              },
              {
                label: "Matches finished",
                value: formatNumber(report.metrics.finishedMatches),
                note: "Completed, retired, or walkover",
              },
            ]}
          />

          <SectionHeading
            title="Commercial pulse"
            description={`${formatNumber(report.metrics.activeSubscriptions)} active subscriptions. Revenue is kept separate by currency.`}
          />
          <Card>
            {revenue.length === 0 ? (
              <p className="text-sm text-drift-text-secondary">No revenue recorded in this period.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {revenue.map((item) => (
                  <div key={item.currency} className="rounded-xl border border-drift-border bg-drift-background p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
                      <MaterialIcon name="payments" className="text-[17px] text-drift-primary" />
                      {item.currency}
                    </div>
                    <div className="mt-2 font-display text-2xl font-bold text-drift-text-primary tabular">
                      {formatMoney(item.amountMinor, item.currency)}
                    </div>
                    <div className="mt-1 text-sm text-drift-text-secondary">
                      {formatNumber(item.transactions)} successful payments
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <SectionHeading
            title="Investigate"
            description="Move from the headline into the operating view that explains it."
          />
          <div className="grid gap-3">
            {[
              ["Markets", "Compare player density, activation, and match activity by saved city.", "/analytics/markets", "public"],
              ["Growth", "Inspect lifecycle funnels, time series, and registration cohorts.", "/analytics/growth", "trending_up"],
              ["Revenue", "Break collected and refunded subscription revenue down by source.", "/analytics/revenue", "receipt_long"],
              ["System health", "Check live API, database, and realtime infrastructure status.", "/analytics/system-health", "health_and_safety"],
            ].map(([label, description, href, icon]) => (
              <Link key={href} href={href}>
                <RowCard className="flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-drift-primary-light text-drift-primary">
                      <MaterialIcon name={icon} filled />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-drift-text-primary">{label}</span>
                      <span className="mt-0.5 block text-sm text-drift-text-secondary">{description}</span>
                    </span>
                  </span>
                  <MaterialIcon name="chevron_right" className="text-drift-text-secondary" />
                </RowCard>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
