"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { MediaAsset } from "@/lib/types";
import { EventImage } from "./EventImage";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

export function validateEventImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Choose a PNG or JPG image.";
  if (file.size > MAX_BYTES) return "That image is over 5MB. Choose a smaller file.";
  return null;
}

export async function uploadEventImage(
  clubId: string,
  file: File,
  caption?: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  if (caption?.trim()) form.append("caption", caption.trim());

  const { asset } = await api.upload<{ asset: MediaAsset }>(
    `/clubs/${clubId}/media`,
    form,
  );
  return `/clubs/${clubId}/media/${asset.id}/content`;
}

export function EventImageUpload({
  file,
  existingImageUrl,
  disabled = false,
  onFileChange,
  onClearExisting,
  onError,
}: {
  file: File | null;
  existingImageUrl?: string | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onClearExisting?: () => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function choose(next: File | null) {
    if (!next) return;
    const message = validateEventImage(next);
    if (message) {
      onError(message);
      return;
    }
    onError(null);
    onFileChange(next);
  }

  function clear() {
    onFileChange(null);
    onClearExisting?.();
    onError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasImage = Boolean(previewUrl || existingImageUrl);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-drift-text-secondary">
        Event image (optional)
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        disabled={disabled}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />

      {hasImage ? (
        <div className="overflow-hidden rounded-lg border border-drift-border bg-drift-surface">
          <div className="aspect-[16/7] bg-drift-primary-light">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected event image preview"
                className="h-full w-full object-cover"
              />
            ) : existingImageUrl ? (
              <EventImage
                src={existingImageUrl}
                alt="Current event image"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-bold text-drift-text-primary">
                {file ? file.name : "Current event image"}
              </div>
              <div className="mt-0.5 text-[12.5px] text-drift-text-secondary">
                {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "Uploaded image"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button type="button" variant="ghost" disabled={disabled} onClick={clear}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (disabled || (event.key !== "Enter" && event.key !== " ")) return;
            event.preventDefault();
            inputRef.current?.click();
          }}
          onDragOver={(event) => {
            if (disabled) return;
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            if (disabled) return;
            event.preventDefault();
            setDragging(false);
            choose(event.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-5 py-7 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1 ${
            dragging
              ? "border-drift-primary bg-drift-primary-light"
              : "border-drift-border bg-drift-primary-light/40"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <MaterialIcon
            name="add_photo_alternate"
            className="text-[30px] text-drift-primary"
          />
          <div className="text-sm font-bold text-drift-text-primary">
            Drop an image or click to browse
          </div>
          <div className="text-[12.5px] text-drift-text-secondary">
            PNG or JPG, up to 5MB
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            className="mt-2"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Choose file
          </Button>
        </div>
      )}
    </div>
  );
}
