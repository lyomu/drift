"use client";

import { useRef, useState } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button } from "@/components/ui";
import { mediaUrl } from "@/lib/api-client";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

function validate(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Choose a PNG or JPG image.";
  if (file.size > MAX_BYTES) return "That image is over 5MB. Choose a smaller file.";
  return null;
}

/**
 * A coach's photo, uploaded and removed immediately (there's no "create"
 * step to defer to — the coach or club-admin account already exists).
 * `/media/user-photos/:id` is public/unauthenticated, so the existing photo
 * renders with a plain `<img>` via `mediaUrl()` — no blob fetch needed.
 */
export function CoachPhotoUpload({
  photoUrl,
  onUpload,
  onRemove,
}: {
  photoUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | null) {
    if (!file) return;
    const message = validate(file);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await onRemove();
    } catch {
      setError("The photo could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  const src = mediaUrl(photoUrl);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-drift-text-secondary">
        Photo
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        disabled={busy}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-drift-border bg-drift-primary-light">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Current photo" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-drift-primary">
              <MaterialIcon name="person" className="text-[28px]" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : src ? "Replace" : "Upload photo"}
          </Button>
          {src && (
            <Button type="button" variant="ghost" disabled={busy} onClick={remove}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm font-medium text-drift-error" role="alert">
          {error}
        </p>
      )}
      <p className="text-[12.5px] text-drift-text-secondary">PNG or JPG, up to 5MB</p>
    </div>
  );
}
