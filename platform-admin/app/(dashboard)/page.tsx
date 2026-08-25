"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { OverviewReport } from "@/lib/analytics-types";
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
      {loading && !report && <EmptyState message="Loading platform KPIs…" />}

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
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                {revenue.map((item) => (
                  <div key={item.currency}>
                    <div className="font-display text-2xl font-bold tabular-nums text-drift-text-primary">
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
          <div className="overflow-hidden rounded-lg border border-drift-border bg-drift-surface shadow-sm">
            {[
              ["Markets", "Compare player density, activation, and match activity by saved city.", "/analytics/markets"],
              ["Growth", "Inspect lifecycle funnels, time series, and registration cohorts.", "/analytics/growth"],
              ["Revenue", "Break collected and refunded subscription revenue down by source.", "/analytics/revenue"],
              ["System health", "Check live API, database, and realtime infrastructure status.", "/analytics/system-health"],
            ].map(([label, description, href], index) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between gap-6 px-5 py-4 transition-colors hover:bg-drift-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-drift-primary ${index > 0 ? "border-t border-drift-border" : ""}`}
              >
                <span>
                  <span className="block font-semibold text-drift-text-primary">{label}</span>
                  <span className="mt-0.5 block text-sm text-drift-text-secondary">{description}</span>
                </span>
                <span aria-hidden="true" className="text-drift-primary">→</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
