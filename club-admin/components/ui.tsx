"use client";

import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { useT } from "@/lib/i18n/i18n-context";

export const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  /** `sm` is the design's compact button (34px). */
  size?: "md" | "sm";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
  const sizes: Record<string, string> = {
    md: "h-[42px] rounded-[10px] px-[17px] text-[12px]",
    sm: "min-h-[34px] rounded-[9px] px-[11px] text-[11px]",
  };
  const variants: Record<string, string> = {
    primary:
      "bg-drift-primary text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--color-primary)_22%,transparent)] hover:-translate-y-px hover:bg-drift-primary-dark hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]",
    secondary:
      "border border-drift-border bg-drift-surface text-drift-text-primary shadow-[0_1px_2px_rgb(0_0_0/4%)] hover:-translate-y-px hover:bg-drift-surface-sunken",
    destructive: "bg-drift-error text-white hover:-translate-y-px hover:opacity-90",
    ghost: "text-drift-text-secondary hover:bg-drift-primary-light hover:text-drift-text-primary",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${focusRing} ${className}`}
      {...props}
    />
  );
}

/** The design's 29px bordered icon button (card header "more", row actions). */
export function IconButton({
  icon,
  label,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-[29px] w-[29px] items-center justify-center rounded-lg border border-drift-border bg-drift-surface text-drift-text-secondary transition-all hover:-translate-y-px hover:bg-drift-surface-sunken hover:text-drift-text-primary ${focusRing} ${className}`}
      {...props}
    >
      <MaterialIcon name={icon} className="text-[18px]" />
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-[9px] border border-drift-border bg-drift-surface px-3 py-[11px] text-[13px] text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
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
  const t = useT();
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
            "text-[11px] font-bold text-drift-text-secondary"
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
          aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
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
            visible ? t("common.hide") : t("common.show")
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
      className={`w-full rounded-[9px] border border-drift-border bg-drift-surface px-3 py-[11px] text-[13px] text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-[9px] border border-drift-border bg-drift-surface px-3 py-[11px] text-[13px] text-drift-text-primary ${focusRing} ${props.className ?? ""}`}
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
    <label className="flex flex-col gap-[7px]">
      <span className="text-[11px] font-bold text-drift-text-secondary">
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
      className={`rounded-[14px] border border-drift-border bg-drift-surface p-5 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  below,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Small uppercase label above the title, with the design's status dot. */
  eyebrow?: string;
  /** Rendered under the header block, e.g. a workspace sub-navigation. */
  below?: React.ReactNode;
  /** A section title inside a workspace: smaller, no eyebrow. */
  compact?: boolean;
}) {
  return (
    <>
    <div className={`${compact ? "mb-5" : "mb-6"} flex flex-wrap items-end justify-between gap-x-7 gap-y-4`}>
      <div className="min-w-0">
        {eyebrow && !compact && (
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-drift-text-secondary">
            <span className="h-[7px] w-[7px] rounded-full bg-drift-primary shadow-[0_0_0_4px_var(--color-primary-light)]" />
            {eyebrow}
          </div>
        )}
        <h1
          className={`font-display font-extrabold text-drift-text-primary ${
            compact ? "text-[22px] leading-tight" : "text-[clamp(26px,3vw,38px)] leading-[1.1]"
          }`}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-[7px] max-w-[590px] text-[13px] leading-[1.55] text-drift-text-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
    {below}
    </>
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
  const t = useT();
  const heading = title ?? message ?? t("common.nothingHere");
  // Matches the translated "Loading…" too, so the spinner shows in every language.
  const loading = /^(loading|chargement|cargando)/i.test(heading.trim());

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "px-6 py-10" : "px-6 py-16"
      } ${bare ? "" : "rounded-2xl border border-drift-border bg-drift-surface shadow-card"}`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${
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
      <div className="mt-3.5 text-[14px] font-bold text-drift-text-primary">
        {heading}
      </div>
      {description && (
        <p className="mt-[5px] max-w-sm text-[12px] leading-[1.5] text-drift-text-secondary">
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
  // The design's status pill: tinted, uppercase, with a leading dot.
  const tones: Record<string, string> = {
    neutral: "bg-drift-neutral-surface text-drift-text-secondary",
    success: "bg-drift-success-surface text-drift-success",
    warning: "bg-drift-gold-surface text-drift-gold",
    error: "bg-drift-error-surface text-drift-error",
    info: "bg-drift-primary-light text-drift-primary-dark",
  };
  return (
    <span
      className={`inline-flex w-fit items-center gap-[5px] rounded-full px-2 py-[5px] text-[11px] font-extrabold uppercase leading-none ${tones[tone]}`}
    >
      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current" />
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
    case "CHANGES_REQUESTED":
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
      className={`border-b border-drift-border bg-drift-surface-sunken px-[18px] py-3 text-left text-[11px] font-bold uppercase text-drift-text-secondary ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-drift-border px-[18px] py-3.5 align-middle text-[13px] text-drift-text-primary ${className}`}>
      {children}
    </td>
  );
}
