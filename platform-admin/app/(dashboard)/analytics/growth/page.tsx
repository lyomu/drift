"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { GrowthReport, GrowthStep } from "@/lib/analytics-types";
import {
  BarList,
  DateRangeToolbar,
  SectionHeading,
  defaultDateRange,
  downloadCsv,
  formatNumber,
  formatPercent,
  queryForRange,
} from "@/components/analytics";
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Td, Th } from "@/components/ui";

const initialRange = defaultDateRange(90);

export default function GrowthAnalyticsPage() {
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState("registration");
  const [selectedStep, setSelectedStep] = useState<GrowthStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.get<GrowthReport>(`/analytics/growth?${queryForRange(from, to)}`);
      setReport(next);
      setSelectedFunnel((current) => next.funnels.some((funnel) => funnel.id === current) ? current : (next.funnels[0]?.id ?? ""));
      setSelectedStep(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Growth analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const funnel = useMemo(
    () => report?.funnels.find((item) => item.id === selectedFunnel),
    [report, selectedFunnel],
  );

  function exportReport() {
    if (!report) return;
    downloadCsv(`drift-growth-${from}-${to}.csv`, [
      ["Series bucket", "Registrations", "Onboarding completions", "Challenges", "Completed matches"],
      ...report.series.map((row) => [row.key, row.registrations, row.onboardingCompletions, row.challenges, row.completedMatches]),
      [],
      ["Cohort", "Registered", "Onboarded", "Played match", "Onboarding rate", "Match activation rate"],
      ...report.cohorts.map((row) => [row.cohort, row.registered, row.onboarded, row.playedMatch, row.onboardingRate, row.matchActivationRate]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Growth analytics"
        description="Registration cohorts and persisted lifecycle funnels from first account to real play."
        action={<Button variant="secondary" disabled={!report} onClick={exportReport}>Export CSV</Button>}
      />
      <DateRangeToolbar from={from} to={to} loading={loading} onFromChange={setFrom} onToChange={setTo} onApply={() => void load()} />
      <ErrorBanner message={error} />
      {loading && !report && <EmptyState message="Loading growth analytics…" />}

      {report && (
        <>
          <div className="mb-6 rounded-md border border-drift-primary/30 bg-drift-primary-light px-4 py-3 text-sm leading-6 text-drift-primary-dark">
            {report.coverage}
          </div>
          <SectionHeading title="Growth over time" description={`Buckets adjust to the selected range; this view is grouped by ${report.bucketUnit}.`} />
          {report.series.every((row) => row.registrations === 0 && row.onboardingCompletions === 0) ? (
            <EmptyState message="No growth milestones were recorded in this period." />
          ) : (
            <BarList
              valueLabel="New registrations"
              rows={report.series.map((row) => ({
                label: row.key,
                value: row.registrations,
                secondary: `${formatNumber(row.onboardingCompletions)} onboarding completions · ${formatNumber(row.completedMatches)} completed matches`,
              }))}
            />
          )}

          <SectionHeading title="Funnels" description="Choose a flow, then open any step to see the exact persisted fact behind it." />
          <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Growth funnels">
            {report.funnels.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === selectedFunnel}
                onClick={() => { setSelectedFunnel(item.id); setSelectedStep(null); }}
                className={`min-h-10 rounded-md border px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary ${item.id === selectedFunnel ? "border-drift-primary bg-drift-primary-light text-drift-primary-dark" : "border-drift-border bg-drift-surface text-drift-text-secondary hover:text-drift-text-primary"}`}
              >
                {item.name}
              </button>
            ))}
          </div>
          {funnel && (
            <Card className="p-0">
              <div className="grid md:grid-cols-2 xl:grid-cols-3">
                {funnel.steps.map((step, index) => (
                  <button
                    key={step.name}
                    type="button"
                    onClick={() => setSelectedStep(step)}
                    className={`min-h-32 p-5 text-left transition-colors hover:bg-drift-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-drift-primary ${index > 0 ? "border-t border-drift-border md:border-l md:border-t-0" : ""}`}
                  >
                    <span className="block text-sm font-semibold text-drift-text-secondary">{step.name}</span>
                    <span className="mt-1 block font-display text-3xl font-bold tabular-nums text-drift-text-primary">{formatNumber(step.count)}</span>
                    <span className="mt-1 block text-xs text-drift-text-secondary">{index === 0 ? "Entry volume" : `${formatPercent(step.conversionRate)} from prior step`} · Open definition</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
          {selectedStep && (
            <div className="mt-3 rounded-md border border-drift-border bg-drift-background px-4 py-3 text-sm text-drift-text-primary">
              <strong>{selectedStep.name}:</strong> {selectedStep.definition}
            </div>
          )}

          <SectionHeading title="Registration cohorts" description="Activation is measured against the players registered in each cohort, not against all-time totals." />
          {report.cohorts.length === 0 ? (
            <EmptyState message="No registration cohorts exist in this period." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-drift-border bg-drift-surface">
              <table className="w-full min-w-[680px]">
                <thead><tr><Th>Cohort</Th><Th>Registered</Th><Th>Onboarded</Th><Th>Onboarding rate</Th><Th>Played a match</Th><Th>Match activation</Th></tr></thead>
                <tbody>{report.cohorts.map((row) => <tr key={row.cohort}><Td>{row.cohort}</Td><Td>{formatNumber(row.registered)}</Td><Td>{formatNumber(row.onboarded)}</Td><Td>{formatPercent(row.onboardingRate)}</Td><Td>{formatNumber(row.playedMatch)}</Td><Td>{formatPercent(row.matchActivationRate)}</Td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
