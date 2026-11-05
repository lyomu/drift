"use client";

/**
 * Building blocks introduced by the club-admin redesign (Figma Make export
 * "Redesign Tennis Club Dashboard"). They sit beside `ui.tsx` rather than in it
 * so the original primitives stay small; both files use the same `drift-*`
 * tokens, so nothing here needs its own palette.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MaterialIcon, TONE_CLASSES, type Tone } from "@/components/dashboard-design";
import { IconButton, focusRing } from "@/components/ui";
import { useT } from "@/lib/i18n/i18n-context";

/** Pill-style segmented filter: All / Active / Completed ... */
export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-[3px] rounded-[10px] border border-drift-border bg-drift-surface-sunken p-[3px]"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-[30px] rounded-[7px] px-[11px] text-[11px] font-bold transition-colors ${focusRing} ${
              active
                ? "bg-drift-surface text-drift-primary-dark shadow-[0_1px_5px_rgb(0_0_0/9%)]"
                : "text-drift-text-secondary hover:text-drift-primary-dark"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The design's compact bordered search field. */
export function InlineSearch({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <label
      className={`flex h-[38px] min-w-[210px] items-center gap-2 rounded-[9px] border border-drift-border bg-drift-surface-sunken px-2.5 text-drift-text-secondary focus-within:border-drift-primary ${className}`}
    >
      <MaterialIcon name="search" className="text-[18px]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-drift-text-primary outline-none placeholder:text-drift-text-secondary"
      />
      {value && (
        <button
          type="button"
          aria-label={t("common.clearSearch")}
          onClick={() => onChange("")}
          className="flex items-center p-0.5 text-drift-text-secondary hover:text-drift-text-primary"
        >
          <MaterialIcon name="close" className="text-[15px]" />
        </button>
      )}
    </label>
  );
}

/** Filter select with a leading funnel icon, same height as InlineSearch. */
export function FilterSelect({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex h-[38px] items-center gap-2 rounded-[9px] border border-drift-border bg-drift-surface-sunken px-[9px] text-drift-text-secondary focus-within:border-drift-primary">
      <MaterialIcon name="filter_list" className="text-[17px]" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-0 bg-transparent pr-1 text-[12px] font-semibold text-drift-text-primary outline-none"
      >
        {children}
      </select>
    </label>
  );
}

/** Rounded white card with the design's header row (title, subtitle, actions). */
export function ManagementCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-drift-border bg-drift-surface shadow-card ${className}`}
    >
      {(title || actions) && (
        <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-5 border-b border-drift-border px-5 py-3.5">
          <div>
            {title && <h2 className="text-[14px] font-extrabold text-drift-text-primary">{title}</h2>}
            {subtitle && (
              <span className="mt-[3px] block text-[11px] text-drift-text-secondary">{subtitle}</span>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** A row of small summary tiles (icon, number, label). */
export function SummaryStrip({
  items,
  columns = 3,
}: {
  items: { icon: string; tone?: Tone; value: React.ReactNode; label: string }[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={`mb-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2 ${
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
      }`}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-[14px] border border-drift-border bg-drift-surface px-[18px] py-4 shadow-card"
        >
          <span
            className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${TONE_CLASSES[item.tone ?? "primary"]}`}
          >
            <MaterialIcon name={item.icon} className="text-[19px]" />
          </span>
          <p className="min-w-0">
            <strong className="block text-[18px] font-extrabold leading-tight text-drift-text-primary">
              {item.value}
            </strong>
            <small className="mt-0.5 block text-[11px] text-drift-text-secondary">{item.label}</small>
          </p>
        </div>
      ))}
    </div>
  );
}

/** Overview stat card: icon chip, label, big number, hint, optional delta pill. */
export function StatCard({
  icon,
  tone = "primary",
  label,
  value,
  hint,
  delta,
  deltaPositive = false,
  href,
  hrefLabel,
  compactValue = false,
}: {
  icon: string;
  tone?: Tone;
  label: string;
  value: React.ReactNode;
  /** Smaller value type, for text values such as an event name (design: 15px). */
  compactValue?: boolean;
  hint?: string;
  delta?: string;
  deltaPositive?: boolean;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <article className="flex min-h-[102px] min-w-0 items-center gap-3 rounded-[14px] border border-drift-border bg-drift-surface p-[17px] shadow-card">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ${TONE_CLASSES[tone]}`}
      >
        <MaterialIcon name={icon} className="text-[20px]" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-drift-text-secondary">{label}</span>
        <strong
          className={`my-0.5 block truncate font-extrabold text-drift-text-primary ${
            compactValue ? "text-[15px] leading-[28px]" : "text-[22px]"
          }`}
        >
          {value}
        </strong>
        {hint && <small className="block truncate text-[11px] text-drift-text-secondary">{hint}</small>}
      </div>
      {delta && (
        <span
          className={`self-start whitespace-nowrap rounded-full px-[7px] py-1 text-[11px] font-bold ${
            deltaPositive
              ? "bg-drift-success-surface text-drift-success"
              : "bg-drift-neutral-surface text-drift-text-secondary"
          }`}
        >
          {delta}
        </span>
      )}
      {href && (
        <Link
          href={href}
          aria-label={hrefLabel}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-drift-border bg-drift-surface text-drift-text-secondary hover:bg-drift-surface-sunken"
        >
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </Link>
      )}
    </article>
  );
}

/** "< All members" style back button. */
export function BackButton({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const cls = `inline-flex min-h-9 items-center gap-1.5 rounded-[9px] border border-drift-border bg-drift-surface px-[11px] text-[11px] font-bold text-drift-text-secondary transition-colors hover:border-drift-primary hover:text-drift-primary ${focusRing}`;
  const content = (
    <>
      <MaterialIcon name="chevron_left" className="text-[16px]" />
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}

export type ActionMenuItem =
  | { divider: true }
  | {
      icon: string;
      label: string;
      description?: string;
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    };

/** Three-dot dropdown used on table rows and cards. Closes on outside click / Escape. */
export function ActionMenu({
  items,
  label,
}: {
  items: ActionMenuItem[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <IconButton
        icon="more_horiz"
        label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={open ? "bg-drift-primary-light text-drift-primary" : ""}
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[210px] rounded-xl border border-drift-border bg-drift-surface p-1.5 shadow-[0_16px_40px_rgb(0_0_0/16%)]"
        >
          {items.map((item, index) =>
            "divider" in item ? (
              <div key={`divider-${index}`} className="my-1 h-px bg-drift-border" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors disabled:opacity-50 ${
                  item.danger
                    ? "text-drift-error hover:bg-drift-error-surface"
                    : "text-drift-text-primary hover:bg-drift-surface-sunken"
                }`}
              >
                <MaterialIcon name={item.icon} className="text-[18px]" />
                <span className="min-w-0">
                  <strong className="block text-[12px] font-bold">{item.label}</strong>
                  {item.description && (
                    <small className="block text-[11px] text-drift-text-secondary">
                      {item.description}
                    </small>
                  )}
                </span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
