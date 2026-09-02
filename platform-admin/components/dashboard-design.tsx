"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function MaterialIcon({
  name,
  filled = false,
  className = "",
  title,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span aria-hidden={!title} title={title} className={`${filled ? "msf" : "ms"} ${className}`}>
      {name}
    </span>
  );
}

export function IconChip({
  icon,
  tone = "blue",
  className = "",
}: {
  icon: string;
  tone?: "blue" | "green" | "amber" | "red" | "gray";
  className?: string;
}) {
  const tones = {
    blue: "bg-drift-primary-light text-drift-primary",
    green: "bg-drift-success-surface text-drift-success",
    amber: "bg-drift-warning-surface text-drift-warning",
    red: "bg-drift-error-surface text-drift-error",
    gray: "bg-drift-neutral-surface text-drift-text-secondary",
  };
  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${tones[tone]} ${className}`}>
      <MaterialIcon name={icon} />
    </span>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-drift-border bg-drift-surface shadow-[0_1px_3px_rgba(17,24,39,0.05)] ${className}`}>
      {children}
    </section>
  );
}

export function RowCard({
  children,
  className = "",
  selected = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <div
      className={`rowcard rounded-lg border px-5 py-4 shadow-[0_1px_3px_rgba(17,24,39,0.05)] transition-colors ${
        selected ? "border-drift-primary bg-drift-primary-light" : "border-drift-border bg-drift-surface hover:bg-drift-primary-light/35"
      } ${className}`}
    >
      {children}
    </div>
  );
  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: string;
  tone?: "blue" | "green" | "amber" | "red" | "gray";
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-bold uppercase text-drift-text-secondary">{label}</div>
          <div className="mt-1 font-display text-3xl font-bold leading-tight text-drift-text-primary tabular">{value}</div>
          {note && <div className="mt-1 text-xs leading-5 text-drift-text-secondary">{note}</div>}
        </div>
        {icon && <IconChip icon={icon} tone={tone} />}
      </div>
    </Panel>
  );
}

export function StatBand({
  stats,
}: {
  stats: Array<{
    label: string;
    value: ReactNode;
    note?: string;
    icon?: string;
    tone?: "blue" | "green" | "amber" | "red" | "gray";
  }>;
}) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stats.map((stat) => (
        <MetricCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          note={stat.note}
          icon={stat.icon}
          tone={stat.tone}
        />
      ))}
    </div>
  );
}

export function DefinitionList({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3 border-b border-drift-border pb-3 last:border-0 last:pb-0">
          <dt className="font-semibold text-drift-text-secondary">{row.label}</dt>
          <dd className="text-right font-bold text-drift-text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailRail({
  title,
  eyebrow,
  children,
  actions,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={`p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="text-[11px] font-bold uppercase text-drift-text-secondary">{eyebrow}</div>}
          <h2 className="mt-1 font-display text-xl font-bold leading-6 text-drift-text-primary">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </Panel>
  );
}

export function ModalShell({
  title,
  description,
  children,
  footer,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="w-full max-w-2xl rounded-lg border border-drift-border bg-drift-surface shadow-[0_24px_80px_rgba(17,24,39,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-drift-border px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-bold text-drift-text-primary">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-drift-text-secondary">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="actionbtn rounded-md p-2 text-drift-text-secondary" aria-label="Close">
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-drift-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// Base layout shared by CompactButton and ActionLink. The tone classes are kept
// out of here so a caller never ends up with two competing `bg-*` / `text-*`
// utilities in one class list — under Tailwind v4 the winner is decided by CSS
// source order, not by the order they appear in `className`, which is how the
// "primary" buttons rendered white-on-white before.
const compactBase =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

// "secondary" keeps the `pbtn` hover (light-blue wash from globals.css); "primary"
// drops `pbtn` so that same rule can't wash white text onto a light background.
const compactTone: Record<"primary" | "secondary", string> = {
  primary: "border-drift-primary bg-drift-primary text-white hover:bg-drift-primary-dark",
  secondary: "pbtn border-drift-border bg-drift-surface text-drift-text-primary",
};

export function CompactButton({
  icon,
  children,
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string; variant?: "primary" | "secondary" }) {
  return (
    <button
      type={type}
      className={`${compactBase} ${compactTone[variant]} ${className}`}
      {...props}
    >
      {icon && <MaterialIcon name={icon} className="text-[18px]" />}
      {children}
    </button>
  );
}

export function ActionLink({
  href,
  icon,
  children,
  variant = "secondary",
  className = "",
}: {
  href: string;
  icon?: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link href={href} className={`${compactBase} ${compactTone[variant]} ${className}`}>
      {icon && <MaterialIcon name={icon} className="text-[18px]" />}
      {children}
    </Link>
  );
}

export function InitialsAvatar({ label }: { label: string }) {
  const initials = label
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-drift-primary text-sm font-bold text-white">
      {initials || "D"}
    </span>
  );
}
