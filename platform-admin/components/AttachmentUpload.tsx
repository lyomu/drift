"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "./dashboard-design";
import { api } from "@/lib/api-client";
import type { SupportTicketMessageAttachment } from "@/lib/support-types";

/**
 * Trimmed from club-admin/components/EventImageUpload.tsx for support
 * ticket replies: same validate/preview shape, but a compact inline picker
 * (button + thumbnail chip) rather than a full dropzone card — this sits
 * beside a reply box, not as its own form section, and a reply never has an
 * "existing" attachment to replace, only a fresh one to pick or clear.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

export function validateAttachment(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Choose a PNG or JPG image.";
  if (file.size > MAX_BYTES) return "That image is over 5MB. Choose a smaller file.";
  return null;
}

export async function uploadMessageAttachment(
  ticketId: string,
  messageId: string,
  file: File,
): Promise<{ id: string; filename: string; mimeType: string; createdAt: string }> {
  const form = new FormData();
  form.append("file", file);
  const { attachment } = await api.upload<{
    attachment: { id: string; filename: string; mimeType: string; createdAt: string };
  }>(`/support/tickets/${ticketId}/messages/${messageId}/attachments`, form);
  return attachment;
}

/**
 * Renders an already-uploaded attachment. The content route is behind
 * PlatformGuard, so a raw <img src> can't carry the bearer token — fetched
 * as a blob and rendered via object URL instead, mirroring
 * club-admin/components/EventImage.tsx's pattern for the same constraint.
 */
export function AttachmentThumbnail({
  ticketId,
  messageId,
  attachment,
}: {
  ticketId: string;
  messageId: string;
  attachment: SupportTicketMessageAttachment;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    setFailed(false);
    setObjectUrl(null);
    api
      .blob(`/support/tickets/${ticketId}/messages/${messageId}/attachments/${attachment.id}/content`)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [ticketId, messageId, attachment.id]);

  if (failed || !objectUrl) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- fetched object URL, not next/image territory
    <img
      src={objectUrl}
      alt={attachment.filename}
      className="mt-2 h-16 w-16 rounded-lg border border-drift-border object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function AttachmentUpload({
  file,
  disabled = false,
  onFileChange,
  onError,
}: {
  file: File | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
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
    const message = validateAttachment(next);
    if (message) {
      onError(message);
      return;
    }
    onError(null);
    onFileChange(next);
  }

  function clear() {
    onFileChange(null);
    onError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        disabled={disabled}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />
      {file && previewUrl ? (
        <div className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-surface py-1 pl-1 pr-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not next/image territory */}
          <img src={previewUrl} alt="" className="h-8 w-8 rounded object-cover" />
          <span className="max-w-[140px] truncate text-[12.5px] font-medium text-drift-text-primary">
            {file.name}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={clear}
            aria-label="Remove attachment"
            className="flex h-5 w-5 items-center justify-center rounded-full text-drift-text-secondary hover:bg-drift-primary-light hover:text-drift-text-primary"
          >
            <MaterialIcon name="close" className="text-[14px]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex h-8 items-center gap-1.5 rounded-md border border-drift-border px-2.5 text-[12.5px] font-semibold text-drift-text-secondary transition-colors hover:bg-drift-primary-light hover:text-drift-text-primary disabled:opacity-50"
        >
          <MaterialIcon name="attach_file" className="text-[16px]" />
          Attach image
        </button>
      )}
    </div>
  );
}
