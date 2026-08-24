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
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
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
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-2 text-sm text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-2 text-sm text-drift-text-primary placeholder:text-drift-text-secondary ${focusRing} ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-drift-border bg-drift-surface px-3 py-2 text-sm text-drift-text-primary ${focusRing} ${props.className ?? ""}`}
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
      className={`rounded-lg border border-drift-border bg-drift-surface p-6 shadow-sm ${className}`}
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
        <h1 className="font-display text-[28px] font-bold leading-[34px] text-drift-text-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-drift-text-secondary">
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
