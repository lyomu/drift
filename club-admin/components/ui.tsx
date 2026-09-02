"use client";

import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { MaterialIcon } from "@/components/dashboard-design";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-[18px] py-2.5 text-[13.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-drift-primary text-white hover:bg-drift-primary-dark",
    secondary:
      "bg-drift-surface text-drift-text-primary border border-drift-border hover:bg-drift-primary-light",
    destructive: "bg-drift-error text-white hover:opacity-90",
    ghost: "text-drift-text-secondary hover:text-drift-text-primary hover:bg-drift-primary-light",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${focusRing} ${className}`}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-[9px] text-[13.5px] text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function PasswordField({
  label,
  action,
  className = "",
  inputClassName = "",
  labelClassName,
  toggleVariant = "icon",
  toggleClassName = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  action?: React.ReactNode;
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
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className={
            labelClassName ??
            "text-[13px] font-semibold text-drift-text-secondary"
          }
        >
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-[9px] pr-11 text-[13.5px] text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${inputClassName}`}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={props.disabled}
          onClick={() => setVisible((current) => !current)}
          className={
            toggleVariant === "text"
              ? `absolute right-4 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-[12.5px] font-bold text-drift-text-secondary transition-colors hover:text-drift-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${toggleClassName}`
              : `absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-drift-text-secondary transition-colors hover:bg-drift-primary-light hover:text-drift-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${toggleClassName}`
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

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-[9px] text-[13.5px] text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-[9px] text-[13.5px] text-drift-text-primary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-drift-text-secondary">
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-drift-border bg-drift-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-extrabold leading-[32px] text-drift-text-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-[560px] text-sm text-drift-text-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md border border-drift-error/30 bg-drift-error-surface px-4 py-3 text-sm text-drift-error">
      {message}
    </div>
  );
}

/**
 * Shared empty / loading / zero-data state. `message` is the legacy single-line
 * API and still works; `title` + `description` + `icon` + `action` give the
 * fuller designed state. A "Loading…" message renders as a neutral loading
 * card automatically.
 */
export function EmptyState({
  message,
  title,
  description,
  icon,
  action,
  compact = false,
  bare = false,
}: {
  message?: string;
  title?: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
  /** Tighter vertical padding — for use inside an already-bordered panel. */
  compact?: boolean;
  /** Drop the border/background — the parent already provides the frame. */
  bare?: boolean;
}) {
  const heading = title ?? message ?? "Nothing here yet";
  const loading = /^(loading|loading…|loading\.\.\.)/i.test(heading.trim());

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "px-6 py-10" : "px-6 py-16"
      } ${bare ? "" : "rounded-lg border border-drift-border bg-drift-surface"}`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          loading
            ? "bg-drift-neutral-surface text-drift-text-secondary"
            : "bg-drift-primary-light text-drift-primary"
        }`}
      >
        <MaterialIcon
          name={loading ? "hourglass_top" : icon ?? "inbox"}
          className={`text-[22px] ${loading ? "animate-pulse" : ""}`}
        />
      </span>
      <div className="mt-4 text-[15px] font-bold text-drift-text-primary">
        {heading}
      </div>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-drift-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status helpers were originally kept in parity with
// `platform-admin/components/ui.tsx`; the club admin base primitives now carry
// the club-dashboard redesign while this status map remains the shared contract.
//
// The two consoles had drifted: platform-admin had Badge/statusTone/Th/Td that
// this app lacked, while this app had a separate StatusBadge with its own
// status-to-tone map. Two maps meant a status could render green in one console
// and grey in the other. Until there's a shared package, "identical file in
// both apps" is the closest thing to one source of truth, so edit them
// together.
// ---------------------------------------------------------------------------

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-drift-neutral-surface text-drift-text-secondary border-drift-border",
    success: "bg-drift-success-surface text-drift-success border-drift-success/30",
    warning: "bg-drift-warning-surface text-drift-warning border-drift-warning/30",
    error: "bg-drift-error-surface text-drift-error border-drift-error/30",
    info: "bg-drift-primary-light text-drift-primary-dark border-drift-primary/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-[3px] text-[11.5px] font-bold leading-none ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Status-to-badge-tone mapping shared by every list page in both consoles.
 *
 * Merged from the two previously-separate maps. Two conflicts were resolved
 * on meaning rather than on which app got there first:
 *   - DISPUTED is `warning`, not `error`; a contested result is actionable,
 *     not broken.
 *   - DRAFT is `neutral`, not `warning`; unpublished is a normal state, and
 *     colouring it amber makes every new item look wrong.
 */
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

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-drift-border px-3 py-2 text-left text-xs font-bold uppercase text-drift-text-secondary ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-drift-border px-3 py-2.5 align-middle text-sm text-drift-text-primary ${className}`}>
      {children}
    </td>
  );
}
