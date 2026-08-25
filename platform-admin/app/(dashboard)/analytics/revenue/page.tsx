"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { RevenueReport } from "@/lib/analytics-types";
import {
  BarList,
  DateRangeToolbar,
  MetricStrip,
  SectionHeading,
  defaultDateRange,
  downloadCsv,
  formatMoney,
  formatNumber,
  queryForRange,
} from "@/components/analytics";
import { Badge, Button, EmptyState, ErrorBanner, PageHeader, Td, Th, statusTone } from "@/components/ui";

const initialRange = defaultDateRange(90);

export default function RevenueDashboardPage() {
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [source, setSource] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.get<RevenueReport>(`/analytics/revenue?${queryForRange(from, to)}`));
      setSource("ALL");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Revenue analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const transactions = useMemo(
    () => report?.transactions.filter((transaction) => source === "ALL" || transaction.source === source) ?? [],
    [report, source],
  );
  const sourceNames = [...new Set(report?.sources.map((item) => item.source) ?? [])];

  function exportReport() {
    if (!report) return;
    downloadCsv(`drift-revenue-${from}-${to}.csv`, [
      ["Invoice", "Date", "Plan", "Audience", "Provider", "Reference", "Status", "Amount minor", "Currency", "Failure reason"],
      ...report.transactions.map((row) => [row.invoiceNumber, row.createdAt, row.source, row.audience, row.provider, row.providerReference, row.status, row.amountMinor, row.currency, row.failureReason]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Revenue dashboard"
        description="Successful, refunded, and failed subscription charges, separated by source and currency."
        action={<Button variant="secondary" disabled={!report} onClick={exportReport}>Export CSV</Button>}
      />
      <DateRangeToolbar from={from} to={to} loading={loading} onFromChange={setFrom} onToChange={setTo} onApply={() => void load()} />
      <ErrorBanner message={error} />
      {loading && !report && <EmptyState message="Loading revenue…" />}
      {report && report.currencies.length === 0 && <EmptyState message="No revenue recorded yet" />}

      {report && report.currencies.length > 0 && (
        <>
          {report.currencies.map((currency) => (
            <div key={currency.currency} className="mb-5">
              <div className="mb-2 text-sm font-bold text-drift-text-secondary">{currency.currency}</div>
              <MetricStrip metrics={[
                { label: "Collected", value: formatMoney(currency.collectedMinor, currency.currency), note: "Successful charges" },
                { label: "Refunded", value: formatMoney(currency.refundedMinor, currency.currency), note: "Returned charges" },
                { label: "Failed volume", value: formatMoney(currency.failedMinor, currency.currency), note: "Declined or provider-failed" },
                { label: "Transactions", value: formatNumber(currency.transactions), note: "All payment states" },
              ]} />
            </div>
          ))}

          <SectionHeading title="Revenue by source" description="Plan lines distinguish player and club subscriptions; currencies are never summed together." />
          <BarList valueLabel="Collected revenue" rows={report.sources.map((row) => ({
            label: `${row.source} · ${row.audience.toLowerCase()}`,
            value: row.collectedMinor,
            display: formatMoney(row.collectedMinor, row.currency),
            secondary: `${formatMoney(row.refundedMinor, row.currency)} refunded · ${formatNumber(row.transactions)} transactions`,
          }))} />

          <SectionHeading title="Transaction drill-down" description="Select a revenue line, then inspect its underlying provider records." />
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter transactions by plan">
            {["ALL", ...sourceNames].map((name) => (
              <button key={name} type="button" onClick={() => setSource(name)} className={`min-h-10 rounded-md border px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary ${source === name ? "border-drift-primary bg-drift-primary-light text-drift-primary-dark" : "border-drift-border bg-drift-surface text-drift-text-secondary hover:text-drift-text-primary"}`}>
                {name === "ALL" ? "All revenue lines" : name}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-drift-border bg-drift-surface">
            <table className="w-full min-w-[980px]">
              <thead><tr><Th>Invoice</Th><Th>Date</Th><Th>Source</Th><Th>Provider</Th><Th>Status</Th><Th>Amount</Th><Th>Detail</Th></tr></thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id}>
                    <Td><span className="font-semibold">{row.invoiceNumber}</span></Td>
                    <Td>{new Date(row.createdAt).toLocaleString()}</Td>
                    <Td>{row.source}<div className="text-xs text-drift-text-secondary">{row.audience.toLowerCase()}</div></Td>
                    <Td>{row.provider}<div className="max-w-48 truncate text-xs text-drift-text-secondary" title={row.providerReference}>{row.providerReference}</div></Td>
                    <Td><Badge tone={statusTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge></Td>
                    <Td><span className="font-semibold tabular-nums">{formatMoney(row.amountMinor, row.currency)}</span></Td>
                    <Td>{row.failureReason ?? row.description}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {transactions.length === 0 && <div className="mt-3"><EmptyState message="No transactions match this revenue line." /></div>}
          <p className="mt-3 text-xs text-drift-text-secondary">Showing the 100 most recent transactions in the selected period. Provider-sync failures retain their specific failure reason.</p>
        </>
      )}
    </div>
  );
}
