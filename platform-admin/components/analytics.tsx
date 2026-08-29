"use client";

import type { FormEvent, ReactNode } from "react";
import { MaterialIcon, MetricCard } from "@/components/dashboard-design";
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
        <Button type="submit" icon="calendar_month" disabled={loading}>
          {loading ? "Refreshing..." : "Apply date range"}
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
  const icons = ["groups", "person_add", "check_circle", "sports_tennis"];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          note={metric.note}
          icon={icons[index] ?? "analytics"}
        />
      ))}
    </dl>
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
        <h2 className="font-display text-xl font-bold text-drift-text-primary">
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
              <span className="flex items-center gap-2 font-bold text-drift-text-primary">
                <MaterialIcon name="bar_chart" className="text-[17px] text-drift-primary" />
                {row.label}
              </span>
              <span className="tabular text-drift-text-secondary">
                {row.display ?? formatNumber(row.value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-sm bg-drift-neutral-surface">
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
