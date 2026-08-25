"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { MarketReport } from "@/lib/analytics-types";
import {
  BarList,
  DateRangeToolbar,
  MetricStrip,
  SectionHeading,
  defaultDateRange,
  formatNumber,
  formatPercent,
  queryForRange,
} from "@/components/analytics";
import { Card, EmptyState, ErrorBanner, Field, PageHeader, Select, Td, Th } from "@/components/ui";

const initialRange = defaultDateRange();

export default function MarketDashboardPage() {
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [report, setReport] = useState<MarketReport | null>(null);
  const [marketName, setMarketName] = useState("");
  const [comparisons, setComparisons] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.get<MarketReport>(`/analytics/markets?${queryForRange(from, to)}`);
      setReport(next);
      setMarketName((current) =>
        next.markets.some((market) => market.name === current)
          ? current
          : (next.markets[0]?.name ?? ""),
      );
      setComparisons((current) =>
        current.filter((name) => next.markets.some((market) => market.name === name)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Market analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const selected = report?.markets.find((market) => market.name === marketName);
  const comparisonRows = useMemo(
    () => report?.markets.filter((market) => market.name === marketName || comparisons.includes(market.name)) ?? [],
    [comparisons, marketName, report],
  );

  function toggleComparison(name: string) {
    setComparisons((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : current.length < 3
          ? [...current, name]
          : current,
    );
  }

  return (
    <div>
      <PageHeader
        title="Market / City dashboard"
        description="Player adoption and match activity grouped by the general location players chose for discovery."
      />
      <DateRangeToolbar from={from} to={to} loading={loading} onFromChange={setFrom} onToChange={setTo} onApply={() => void load()} />
      <ErrorBanner message={error} />
      {loading && !report && <EmptyState message="Loading markets…" />}
      {report?.markets.length === 0 && <EmptyState message="No markets configured yet" />}

      {report && report.markets.length > 0 && selected && (
        <>
          <Card className="mb-6 max-w-xl p-4">
            <Field label="Selected market">
              <Select value={marketName} onChange={(event) => setMarketName(event.target.value)}>
                {report.markets.map((market) => <option key={market.name} value={market.name}>{market.name}</option>)}
              </Select>
            </Field>
            <p className="mt-2 text-xs text-drift-text-secondary">Source: {report.dimension}. Exact coordinates are never exposed here.</p>
          </Card>

          <MetricStrip metrics={[
            { label: "Players", value: formatNumber(selected.players), note: `${formatNumber(selected.activePlayers)} active accounts` },
            { label: "New players", value: formatNumber(selected.newPlayers), note: "Registered in this period" },
            { label: "Onboarding rate", value: formatPercent(selected.onboardingRate), note: "All profiles in this market" },
            { label: "Completed matches", value: formatNumber(selected.completedMatches), note: `${formatNumber(selected.matches)} matches created in period` },
          ]} />

          <SectionHeading title="Market size" description="Observed player profiles by city or general-location label." />
          <BarList valueLabel="Player profiles" rows={report.markets.slice(0, 20).map((market) => ({
            label: market.name,
            value: market.players,
            secondary: `${formatNumber(market.newPlayers)} new · ${formatPercent(market.onboardingRate)} onboarded`,
          }))} />

          <SectionHeading title="Compare markets" description="Choose up to three peers alongside the selected market." />
          <Card className="mb-3 p-4">
            <div className="flex flex-wrap gap-2">
              {report.markets.filter((market) => market.name !== marketName).map((market) => {
                const checked = comparisons.includes(market.name);
                return (
                  <label key={market.name} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${checked ? "border-drift-primary bg-drift-primary-light text-drift-primary-dark" : "border-drift-border text-drift-text-secondary"}`}>
                    <input type="checkbox" checked={checked} disabled={!checked && comparisons.length >= 3} onChange={() => toggleComparison(market.name)} />
                    {market.name}
                  </label>
                );
              })}
            </div>
          </Card>
          <div className="overflow-x-auto rounded-lg border border-drift-border bg-drift-surface">
            <table className="w-full min-w-[720px]">
              <thead><tr><Th>Market</Th><Th>Players</Th><Th>New</Th><Th>Onboarded</Th><Th>Matches</Th><Th>Completed</Th></tr></thead>
              <tbody>
                {comparisonRows.map((market) => (
                  <tr key={market.name}>
                    <Td><span className="font-semibold">{market.name}</span>{market.name === marketName && <span className="ml-2 text-xs text-drift-primary">Selected</span>}</Td>
                    <Td>{formatNumber(market.players)}</Td>
                    <Td>{formatNumber(market.newPlayers)}</Td>
                    <Td>{formatPercent(market.onboardingRate)}</Td>
                    <Td>{formatNumber(market.matches)}</Td>
                    <Td>{formatNumber(market.completedMatches)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
