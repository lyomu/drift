"use client";

import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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
    "inline-flex items-center justify-center gap-2 rounded-[9px] px-[18px] py-2.5 text-[13.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
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
      className={`w-full rounded-lg border border-drift-border bg-drift-surface px-3 py-[9px] text-[13.5px] text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-drift-border bg-drift-surface px-3 py-[9px] text-[13.5px] text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-drift-border bg-drift-surface px-3 py-[9px] text-[13.5px] text-drift-text-primary ${focusRing} ${props.className ?? ""}`}
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
      className={`rounded-2xl border border-drift-border bg-drift-surface p-5 ${className}`}
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
        <h1 className="font-display text-[26px] font-extrabold leading-[32px] tracking-[-0.3px] text-drift-text-primary">
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

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-drift-border px-6 py-12 text-center text-sm text-drift-text-secondary">
      {message}
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
      className={`border-b border-drift-border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-drift-text-secondary ${className}`}
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
