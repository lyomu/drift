"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId, useState } from "react";
import { MaterialIcon } from "./dashboard-design";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-2";

export function Button({
  variant = "primary",
  className = "",
  children,
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  icon?: string;
}) {
  const base =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-[14px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-drift-primary text-white hover:bg-drift-primary-dark",
    secondary:
      "border border-drift-border bg-drift-surface text-drift-text-primary hover:bg-drift-primary-light",
    destructive: "bg-drift-error text-white hover:opacity-90",
    ghost: "text-drift-text-secondary hover:bg-drift-primary-light hover:text-drift-text-primary",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${focusRing} ${className}`}
      {...props}
    >
      {icon && <MaterialIcon name={icon} className="text-[18px]" />}
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-2.5 text-sm font-medium text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function PasswordField({
  label,
  className = "",
  inputClassName = "",
  labelClassName,
  toggleVariant = "icon",
  toggleClassName = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  inputClassName?: string;
  labelClassName?: string;
  toggleVariant?: "icon" | "text";
  toggleClassName?: string;
}) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={
          labelClassName ??
          "text-[12px] font-bold uppercase text-drift-text-secondary"
        }
      >
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-2.5 pr-11 text-sm font-medium text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${inputClassName}`}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={props.disabled}
          onClick={() => setVisible((current) => !current)}
          className={
            toggleVariant === "text"
              ? `absolute right-4 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-[12.5px] font-bold text-drift-text-secondary transition hover:text-drift-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${toggleClassName}`
              : `absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-drift-text-secondary transition hover:bg-drift-primary-light hover:text-drift-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${toggleClassName}`
          }
        >
          {toggleVariant === "text" ? (
            visible ? "Hide" : "Show"
          ) : (
            <MaterialIcon
              name={visible ? "visibility_off" : "visibility"}
              className="text-[18px]"
            />
          )}
        </button>
      </div>
    </div>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-2.5 text-sm font-medium text-drift-text-primary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-2.5 text-sm font-medium text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-drift-border bg-drift-surface p-5 shadow-[0_1px_3px_rgba(17,24,39,0.05)] ${className}`}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const icon =
    titleIconMap[title] ??
    Object.entries(titleIconMap).find(([key]) => title.toLowerCase().includes(key.toLowerCase()))?.[1] ??
    "dashboard";
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-drift-primary-light text-drift-primary">
          <MaterialIcon name={icon} filled />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-bold leading-9 text-drift-text-primary">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-drift-text-secondary">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

const titleIconMap: Record<string, string> = {
  "Platform overview": "dashboard",
  "Role management": "badge",
  "Team users": "group",
  "Permission matrix": "rule_settings",
  "Market analytics": "public",
  "Growth analytics": "trending_up",
  "Revenue dashboard": "payments",
  "System health": "health_and_safety",
  "Audit log": "history",
  "Venue database": "stadium",
  "Add venue": "add_location_alt",
  "Google Places sync status": "sync",
  "Verification workflow": "verified",
  "Duplicate merge": "merge",
  "Organizations": "corporate_fare",
  "Admin approvals": "approval",
  "Subscription status": "workspace_premium",
  "Community moderation": "forum",
  "Global competitions": "emoji_events",
  "Rulesets": "rule",
  "Disputes": "gavel",
  "Content library": "library_books",
  "Learning paths": "conversion_path",
  "News sources": "rss_feed",
  "News stories": "newspaper",
  "Plans": "sell",
  "Invoices / Payments": "receipt_long",
  "Promotions": "campaign",
  "Sponsors / Ads": "ads_click",
  "Users": "person_search",
  "Reported Content Queue": "flag",
  "Block / Abuse Cases": "block",
  "Support Tickets": "support_agent",
  "Privacy Requests": "privacy_tip",
};

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-drift-error/30 bg-drift-error-surface px-4 py-3 text-sm font-semibold text-drift-error">
      {message}
    </div>
  );
}

export function EmptyState({
  message,
  description,
  icon = "inbox",
}: {
  message: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-drift-border bg-drift-surface px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-drift-neutral-surface text-drift-text-secondary">
        <MaterialIcon name={icon} className="text-[26px]" />
      </span>
      <div>
        <div className="text-sm font-bold text-drift-text-primary">{message}</div>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-drift-text-secondary">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "error" | "info";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "border-drift-border bg-drift-neutral-surface text-drift-text-secondary",
    success: "border-drift-success/30 bg-drift-success-surface text-drift-success",
    warning: "border-drift-warning/30 bg-drift-warning-surface text-drift-warning",
    error: "border-drift-error/30 bg-drift-error-surface text-drift-error",
    info: "border-drift-primary/30 bg-drift-primary-light text-drift-primary-dark",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** "1 court" / "0 courts" / "3 courts" — the noun agrees with the count. */
export function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

export function statusTone(status: string): "neutral" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "ACTIVE":
    case "RESOLVED":
    case "APPROVED":
    case "CONFIRMED":
    case "HEALTHY":
    case "SUCCEEDED":
    case "VERIFIED":
    case "SYNCED":
    case "PUBLISHED":
    case "LIVE":
    case "ON":
    case "CONNECTED":
    case "REGISTRATION_OPEN":
    case "RUNNING":
    case "COMPLETED":
    case "ACTIONED":
    case "FULFILLED":
    case "ENROLLED":
    case "PAID":
    case "ATTENDED":
    case "REGISTERED":
      return "success";
    case "SUSPENDED":
    case "REJECTED":
    case "BLOCKED":
    case "DOWN":
    case "FAILED":
    case "CANCELLED":
    case "REMOVED":
    case "URGENT":
    case "WITHDRAWN":
    case "NO_SHOW":
      return "error";
    case "OPEN":
    case "PENDING":
    case "PENDING_REVIEW":
    case "REVIEWING":
    case "PAUSED":
    case "DEGRADED":
    case "PAST_DUE":
    case "STALE":
    case "MORE_INFO":
    case "ESCALATED":
    case "SCHEDULED":
    case "HIGH":
    case "COMING_SOON":
    case "PARTIAL":
    case "ASSIGNED":
    case "DISPUTED":
      return "warning";
    case "ARCHIVED":
    case "INACTIVE":
    case "EXPIRED":
    case "ENDED":
    case "REFUNDED":
    case "DISMISSED":
    case "CLOSED":
    case "OFF":
    case "DISCONNECTED":
      return "info";
    case "DRAFT":
    case "INVITED":
    case "UNVERIFIED":
    case "WAITLISTED":
    default:
      return "neutral";
  }
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-drift-border bg-drift-neutral-surface px-5 py-4 text-left text-[11px] font-extrabold uppercase text-drift-text-secondary ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`border-b border-drift-border px-5 py-4 align-middle text-sm text-drift-text-primary ${className}`}>
      {children}
    </td>
  );
}
