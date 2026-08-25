"use client";

import { FormEvent, ReactNode } from "react";
import { Button, Card, Field, Input, Td, Th } from "@/components/ui";

export function defaultDateRange(days = 30) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function queryForRange(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return params.toString();
}

export function DateRangeToolbar({
  from,
  to,
  loading,
  onFromChange,
  onToChange,
  onApply,
}: {
  from: string;
  to: string;
  loading: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onApply();
  }

  return (
    <Card className="mb-6 p-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <Field label="From">
          <Input
            type="date"
            required
            max={to}
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            required
            min={from}
            value={to}
            onChange={(event) => onToChange(event.target.value)}
          />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? "Refreshing…" : "Apply date range"}
        </Button>
      </form>
    </Card>
  );
}

export function MetricStrip({
  metrics,
}: {
  metrics: { label: string; value: ReactNode; note?: string }[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <dl className="grid sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`min-w-0 px-5 py-5 ${
              index > 0 ? "border-t border-drift-border sm:border-l" : ""
            } ${index === 2 ? "sm:border-l-0 xl:border-l" : ""} ${
              index > 1 ? "sm:border-t xl:border-t-0" : ""
            }`}
          >
            <dt className="text-sm font-semibold text-drift-text-secondary">
              {metric.label}
            </dt>
            <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-drift-text-primary">
              {metric.value}
            </dd>
            {metric.note && (
              <div className="mt-1 text-xs leading-5 text-drift-text-secondary">
                {metric.note}
              </div>
            )}
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-drift-text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-drift-text-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function BarList({
  rows,
  valueLabel,
}: {
  rows: { label: string; value: number; display?: string; secondary?: string }[];
  valueLabel: string;
}) {
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Card>
      <div className="flex flex-col gap-4" aria-hidden="true">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-4 text-sm">
              <span className="font-semibold text-drift-text-primary">{row.label}</span>
              <span className="tabular-nums text-drift-text-secondary">
                {row.display ?? formatNumber(row.value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-sm bg-drift-background">
              <div
                className="h-full rounded-sm bg-drift-primary"
                style={{ width: `${Math.max(row.value > 0 ? 2 : 0, (row.value / maximum) * 100)}%` }}
              />
            </div>
            {row.secondary && (
              <div className="mt-1 text-xs text-drift-text-secondary">{row.secondary}</div>
            )}
          </div>
        ))}
      </div>
      <div className="sr-only">
        <table>
          <caption>{valueLabel}</caption>
          <thead>
            <tr>
              <Th>Label</Th>
              <Th>{valueLabel}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <Td>{row.label}</Td>
                <Td>{row.display ?? row.value}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
