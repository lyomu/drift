"use client";

import { useId, useState, type ReactNode } from "react";
import { ModalShell } from "@/components/dashboard-design";
import { Button, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api-client";
import { MIN_REASON_LENGTH } from "@/lib/user-types";

/**
 * Confirmation for a sensitive admin action. Replaces `window.confirm`, which
 * cannot collect the written reason the backend now requires and is not
 * accessible or themable.
 *
 * Focus trapping, Escape-to-close and focus restore come from `ModalShell`.
 * The dialog stays open on failure and shows the server's message so the admin
 * can correct the reason or see why the action was refused.
 */
export function ConfirmActionDialog({
  title,
  description,
  consequences,
  confirmLabel,
  destructive = false,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  /** Plain-language effects, shown above the reason field. */
  consequences?: string[];
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
  /** Extra fields (e.g. a role picker) rendered above the reason. */
  children?: ReactNode;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const hintId = useId();

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON_LENGTH;
  const showInvalid = touched && tooShort;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (tooShort || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The action failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title={title}
      description={description}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={`${fieldId}-form`}
            variant={destructive ? "destructive" : "primary"}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? "Working..." : confirmLabel}
          </Button>
        </>
      }
    >
      <form id={`${fieldId}-form`} onSubmit={submit} noValidate className="grid gap-4">
        {consequences && consequences.length > 0 && (
          <ul className="grid gap-1.5 text-sm leading-6 text-drift-text-secondary">
            {consequences.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-[12px] font-bold uppercase text-drift-text-secondary">
            Reason (recorded in the audit log)
          </label>
          <Textarea
            id={fieldId}
            rows={3}
            maxLength={500}
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showInvalid}
            aria-describedby={hintId}
            placeholder="Why is this action necessary?"
          />
          <p
            id={hintId}
            className={`text-xs font-semibold ${showInvalid ? "text-drift-error" : "text-drift-text-secondary"}`}
          >
            {showInvalid
              ? `Enter at least ${MIN_REASON_LENGTH} characters.`
              : `At least ${MIN_REASON_LENGTH} characters. Visible to other administrators.`}
          </p>
        </div>
        {error && (
          <div role="alert" className="rounded-lg border border-drift-error/30 bg-drift-error-surface px-4 py-3 text-sm font-semibold text-drift-error">
            {error}
          </div>
        )}
      </form>
    </ModalShell>
  );
}
