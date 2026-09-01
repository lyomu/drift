"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { Button, Field, Select } from "@/components/ui";
import { MaterialIcon, ModalShell } from "@/components/dashboard-design";

type Option = { value: string; label: string };

/**
 * Replaces inline auto-saving `<Select>` controls across the console. Nothing
 * on this site mutates data the instant a dropdown changes — every change is
 * staged in a modal and only written when the user confirms.
 *
 * Renders a compact trigger showing the current value; clicking it opens a
 * modal with the choices and a Save/Cancel pair. `onSave` must throw on
 * failure so the error surfaces in the modal and it stays open.
 */
export function SelectEditControl({
  value,
  options,
  onSave,
  title,
  description,
  fieldLabel,
  confirmLabel = "Save",
  disabled = false,
  triggerClassName = "",
}: {
  value: string;
  options: Option[];
  onSave: (next: string) => Promise<void>;
  title: string;
  description?: string;
  fieldLabel: string;
  confirmLabel?: string;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = options.find((o) => o.value === value)?.label ?? value;

  function start() {
    setNext(value);
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next === value) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(next);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={start}
        className={`inline-flex items-center gap-1.5 rounded-md border border-drift-border bg-drift-surface px-3 py-1.5 text-[13px] font-semibold text-drift-text-primary transition-colors hover:border-drift-primary disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
      >
        {current}
        <MaterialIcon name="edit" className="text-[15px] text-drift-text-secondary" />
      </button>

      {open && (
        <ModalShell title={title} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {description && (
              <p className="text-[13px] text-drift-text-secondary">{description}</p>
            )}
            <Field label={fieldLabel}>
              <Select value={next} onChange={(e) => setNext(e.target.value)}>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            {error && (
              <p className="text-[13px] font-semibold text-drift-error">{error}</p>
            )}
            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : confirmLabel}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
