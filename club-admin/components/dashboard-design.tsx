"use client";

import Link from "next/link";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

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

/**
 * Tint pairs shared by icon chips, avatars and stat cards. `info`, `warning`,
 * `success`, `error` and `neutral` are the original semantic tones; the rest
 * are the accent tints the redesign uses to tell avatars and chips apart.
 */
export type Tone =
  | "primary"
  | "info"
  | "lime"
  | "forest"
  | "gold"
  | "warning"
  | "coral"
  | "violet"
  | "success"
  | "error"
  | "neutral"
  /** A saturated brand fill with white text, e.g. the events date tile. */
  | "solid";

export const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-drift-primary-light text-drift-primary",
  info: "bg-drift-primary-light text-drift-primary",
  lime: "bg-drift-lime-surface text-drift-lime",
  forest: "bg-drift-forest-surface text-drift-forest",
  gold: "bg-drift-gold-surface text-drift-gold",
  warning: "bg-drift-warning-surface text-drift-warning",
  coral: "bg-drift-coral-surface text-drift-coral",
  violet: "bg-drift-violet-surface text-drift-violet",
  success: "bg-drift-success-surface text-drift-success",
  error: "bg-drift-error-surface text-drift-error",
  neutral: "bg-drift-neutral-surface text-drift-text-secondary",
  solid: "bg-[#0077cc] text-white",
};

const AVATAR_TONES: Tone[] = ["primary", "forest", "gold", "coral", "violet", "lime"];

/** Deterministic tone per name, so a person keeps one colour across screens. */
export function toneForName(name: string): Tone {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function IconChip({
  icon,
  tone = "info",
  round = false,
}: {
  icon: string;
  tone?: Tone;
  round?: boolean;
}) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center ${round ? "rounded-full" : "rounded-[11px]"} ${TONE_CLASSES[tone]}`}
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
    <section className={`rounded-[14px] border border-drift-border bg-drift-surface p-5 shadow-card ${className}`}>
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
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-[14px] font-extrabold text-drift-text-primary">{title}</h2>
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
    <div className={`rowcard rounded-[12px] border border-drift-border bg-drift-surface px-4 py-3 transition-colors hover:bg-drift-primary-light/35 ${className}`}>
      {children}
    </div>
  );
}

export function InitialsAvatar({
  name,
  tone = "primary",
  shape = "soft",
  size = 35,
  className = "",
}: {
  name: string;
  /** `auto` derives a stable tone from the name. */
  tone?: Tone | "auto";
  /** `soft` is the redesign's rounded square; `round` is a circle. */
  shape?: "soft" | "round";
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DT";
  const resolved = tone === "auto" ? toneForName(name) : tone;
  return (
    <span
      // Radius and type scale with the avatar, so 35px stays the design's
      // 11px-rounded tile and a 72px profile avatar scales up in proportion.
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.31)),
        borderRadius: shape === "round" ? 9999 : Math.round(size * 0.31),
      }}
      className={`flex shrink-0 items-center justify-center font-extrabold ${TONE_CLASSES[resolved]} ${className}`}
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
  onClick,
}: {
  icon: string;
  href?: string;
  dot?: boolean;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <span className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-drift-border bg-drift-surface text-drift-text-secondary transition-all hover:-translate-y-px hover:bg-drift-surface-sunken hover:text-drift-text-primary">
      <MaterialIcon name={icon} className="text-[19px]" />
      {dot && (
        <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full border-2 border-drift-surface bg-drift-coral" />
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
    <button type="button" aria-label={label} onClick={onClick}>
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
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-[12px] font-bold text-drift-primary hover:text-drift-primary-dark"
    >
      {children}
    </Link>
  );
}

/** The design's date tile: month over day, tinted. */
export function DateChip({
  value,
  tone = "lime",
}: {
  value: Date;
  tone?: Tone;
}) {
  const { formatDate } = useI18n();
  return (
    <div
      className={`flex h-[43px] w-10 shrink-0 flex-col items-center justify-center rounded-[9px] text-center ${TONE_CLASSES[tone]}`}
    >
      <div className="mb-[3px] text-[11px] font-extrabold uppercase leading-none">
        {formatDate(value, { month: "short" })}
      </div>
      <div className="text-[16px] font-extrabold leading-none tabular">
        {formatDate(value, { day: "2-digit" })}
      </div>
    </div>
  );
}

export function ModalShell({
  title,
  description,
  icon,
  children,
  onClose,
  size = "md",
}: {
  title: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-5 py-8 backdrop-blur-[4px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal-in relative max-h-[90vh] w-full ${size === "lg" ? "max-w-[640px]" : "max-w-[460px]"} overflow-y-auto rounded-[18px] border border-drift-border bg-drift-surface p-7 shadow-[0_30px_90px_rgb(0_0_0/28%)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-[15px] top-[15px] flex h-8 w-8 items-center justify-center rounded-full border border-drift-border bg-drift-surface text-drift-text-secondary transition-colors hover:bg-drift-surface-sunken hover:text-drift-text-primary"
        >
          <MaterialIcon name="close" className="text-[18px]" />
        </button>
        {icon && (
          <span className="mb-[18px] flex h-[43px] w-[43px] items-center justify-center rounded-xl bg-drift-primary-light text-drift-primary">
            <MaterialIcon name={icon} className="text-[21px]" />
          </span>
        )}
        <div className="mb-5 pr-8">
          <h2 className="text-[18px] font-extrabold text-drift-text-primary">{title}</h2>
          {description && (
            <p className="mt-[7px] text-[12px] leading-[1.55] text-drift-text-secondary">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Right-aligned Cancel / confirm row used at the bottom of modals. */
export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2.5">{children}</div>;
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
