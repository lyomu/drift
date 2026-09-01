"use client";

import Link from "next/link";

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
    <span aria-hidden={!title} title={title} className={`ms ${filled ? "msf" : ""} ${className}`}>
      {name}
    </span>
  );
}

export function IconChip({
  icon,
  tone = "info",
  round = false,
}: {
  icon: string;
  tone?: "info" | "success" | "warning" | "error" | "neutral";
  round?: boolean;
}) {
  const tones = {
    info: "bg-drift-primary-light text-drift-primary",
    success: "bg-drift-success-surface text-drift-success",
    warning: "bg-drift-warning-surface text-drift-warning",
    error: "bg-drift-error-surface text-drift-error",
    neutral: "bg-drift-neutral-surface text-drift-text-secondary",
  };
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center ${round ? "rounded-full" : "rounded-md"} ${tones[tone]}`}
    >
      <MaterialIcon name={icon} className="text-xl" />
    </span>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-drift-border bg-drift-surface p-5 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-base font-bold text-drift-text-primary">{title}</h2>
      {action}
    </div>
  );
}

export function RowCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rowcard rounded-lg border border-drift-border bg-drift-surface px-4 py-3 transition-colors hover:bg-drift-primary-light/35 ${className}`}>
      {children}
    </div>
  );
}

export function InitialsAvatar({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DT";
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-drift-primary-light text-[12.5px] font-bold text-drift-primary-dark ${className}`}
    >
      {initials}
    </span>
  );
}

export function HeaderIconButton({
  icon,
  href,
  dot = false,
  label,
}: {
  icon: string;
  href?: string;
  dot?: boolean;
  label: string;
}) {
  const content = (
    <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-drift-border bg-drift-background text-drift-text-primary">
      <MaterialIcon name={icon} className="text-[19px]" />
      {dot && (
        <span className="absolute right-[9px] top-[9px] h-2 w-2 rounded-full border-2 border-drift-surface bg-drift-error" />
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label}>
      {content}
    </button>
  );
}

export function SmallActionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-[13px] font-semibold text-drift-primary hover:text-drift-primary-dark">
      {children}
    </Link>
  );
}

export function DateChip({ value }: { value: Date }) {
  return (
    <div className="w-[46px] shrink-0 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.4px] text-drift-text-secondary">
        {value.toLocaleDateString(undefined, { month: "short" })}
      </div>
      <div className="text-lg font-extrabold leading-6 text-drift-text-primary tabular">
        {value.toLocaleDateString(undefined, { day: "2-digit" })}
      </div>
    </div>
  );
}

export function ModalShell({
  title,
  children,
  onClose,
  size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-drift-text-primary/45 px-4 py-8"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${size === "lg" ? "max-w-[640px]" : "max-w-[460px]"} overflow-y-auto rounded-lg bg-drift-surface p-6`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-extrabold tracking-[-0.2px] text-drift-text-primary">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <MaterialIcon name="close" className="text-xl text-drift-text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-drift-primary" : "bg-drift-border"
      }`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
