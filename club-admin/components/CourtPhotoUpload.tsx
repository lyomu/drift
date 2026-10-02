"use client";

import { useRef, useState } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { api, ApiError, mediaUrl } from "@/lib/api-client";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
const MAX_PHOTOS = 8;

function validate(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Choose a PNG or JPG image.";
  if (file.size > MAX_BYTES) return "That image is over 5MB. Choose a smaller file.";
  return null;
}

/**
 * Court photos are uploaded to the club's own pool as soon as they're
 * chosen (`POST /clubs/:clubId/court-photos`), independent of whether the
 * court itself has been created yet — this is what lets the "New court"
 * form attach photos in the same step. `photoUrls` is the array to include
 * verbatim in the court create/update payload.
 */
export function CourtPhotoUpload({
  clubId,
  photoUrls,
  onChange,
}: {
  clubId: string;
  photoUrls: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | null) {
    if (!file) return;
    if (photoUrls.length >= MAX_PHOTOS) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const message = validate(file);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<{ url: string }>(
        `/clubs/${clubId}/court-photos`,
        form,
      );
      onChange([...photoUrls, res.url]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(url: string) {
    setError(null);
    const id = url.split("/").pop();
    try {
      if (id) await api.delete(`/clubs/${clubId}/court-photos/${id}`);
    } catch {
      // Already detached from the court either way — drop it from the
      // list regardless, rather than leaving a broken thumbnail stuck.
    }
    onChange(photoUrls.filter((existing) => existing !== url));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-drift-text-secondary">
        Photos (optional)
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        disabled={busy}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap gap-3">
        {photoUrls.map((url) => {
          const src = mediaUrl(url);
          return (
            <div
              key={url}
              className="group relative h-24 w-24 overflow-hidden rounded-lg border border-drift-border bg-drift-primary-light"
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="Court photo" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MaterialIcon name="close" className="text-[16px]" />
              </button>
            </div>
          );
        })}
        {photoUrls.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-drift-border bg-drift-primary-light/40 text-drift-primary transition-colors hover:border-drift-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MaterialIcon name="add_photo_alternate" className="text-[22px]" />
            <span className="text-[11px] font-semibold">
              {busy ? "Uploading…" : "Add photo"}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-drift-error" role="alert">
          {error}
        </p>
      )}
      <p className="text-[12.5px] text-drift-text-secondary">PNG or JPG, up to 5MB each</p>
    </div>
  );
}
