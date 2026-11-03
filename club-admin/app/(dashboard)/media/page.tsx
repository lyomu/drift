"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon, ModalShell } from "@/components/dashboard-design";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { MediaAsset } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg"];

export default function MediaPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { clubId, role } = useClub();
  const canManage =
    role === "OWNER" || role === "ADMIN" || role === "CONTENT_MANAGER";
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlsRef = useRef<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await api.get<{ assets: MediaAsset[] }>(`/clubs/${clubId}/media`);
      setAssets(res.assets);
      const pairs = await Promise.all(
        res.assets.map(
          async (asset) =>
            [
              asset.id,
              URL.createObjectURL(
                await api.blob(`/clubs/${clubId}/media/${asset.id}/content`),
              ),
            ] as const,
        ),
      );
      Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
      const nextUrls = Object.fromEntries(pairs);
      urlsRef.current = nextUrls;
      setUrls(nextUrls);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("a.mediaCouldNotBeLoaded"),
      );
    }
  }, [clubId, t]);

  useEffect(() => {
    void load();
    return () => {
      Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, [load]);

  function closeUpload() {
    setShowUpload(false);
    setFile(null);
    setCaption("");
    setFormError(null);
    setDragging(false);
  }

  function pickFile(next: File | null) {
    if (!next) return;
    if (!ACCEPTED.includes(next.type)) {
      setFormError(t("a.choosePngJpg"));
      return;
    }
    if (next.size > MAX_BYTES) {
      setFormError(t("a.imageOver5Mb"));
      return;
    }
    setFormError(null);
    setFile(next);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId || !file) return;
    setBusy(true);
    setFormError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (caption) form.append("caption", caption);
      await api.upload(`/clubs/${clubId}/media`, form);
      closeUpload();
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : t("a.uploadFailedChooseTheImage"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!clubId) return;
    if (!window.confirm(t("a.deleteThisPhotoItWill"))) {
      return;
    }
    try {
      await api.delete(`/clubs/${clubId}/media/${id}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("a.theImageCouldNotBe"),
      );
    }
  }

  return (
    <div>
      <PageHeader
        title={t("a.mediaLibrary")}
        description={t("a.clubImageryUsedAcrossAnnouncements")}
        action={
          canManage ? (
            <Button onClick={() => setShowUpload(true)}>{t("a.uploadPhoto")}</Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      {assets === null ? (
        <EmptyState message={t("a.loading2")} />
      ) : assets.length === 0 ? (
        <EmptyState message={t("a.uploadYourFirstPhoto")} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-xl border border-drift-border bg-drift-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            >
              <div className="relative aspect-[4/3] bg-drift-primary-light">
                {urls[asset.id] ? (
                  <img
                    src={urls[asset.id]}
                    alt={asset.caption ?? asset.filename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <MaterialIcon
                      name="image"
                      className="text-[30px] text-drift-primary"
                    />
                  </div>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => void remove(asset.id)}
                    aria-label={`Delete ${asset.caption || asset.filename}`}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-drift-surface text-drift-error shadow-[0_1px_4px_rgba(15,23,42,0.15)] transition-colors hover:bg-drift-error-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary"
                  >
                    <MaterialIcon name="delete" className="text-[17px]" />
                  </button>
                )}
              </div>
              <div className="px-4 py-3.5">
                <div className="truncate text-[14.5px] font-bold text-drift-text-primary">
                  {asset.caption || asset.filename}
                </div>
                <div className="mt-1 text-[12.5px] text-drift-text-secondary">
                  {formatDate(asset.createdAt, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <ModalShell title={t("a.uploadPhoto")} onClose={closeUpload}>
          <form onSubmit={upload} className="flex flex-col gap-5">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <div
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragging
                  ? "border-drift-primary bg-drift-primary-light"
                  : "border-drift-border bg-drift-primary-light/40"
              }`}
            >
              <MaterialIcon
                name={file ? "check_circle" : "add_photo_alternate"}
                className="text-[30px] text-drift-primary"
              />
              <div className="text-sm font-bold text-drift-text-primary">
                {file ? file.name : t("a.dropImageBrowse")}
              </div>
              <div className="text-[12.5px] text-drift-text-secondary">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                  : "PNG or JPG, up to 5MB"}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInput.current?.click();
                }}
              >
                {file ? t("a.chooseDifferentFile") : t("a.chooseFile")}
              </Button>
            </div>

            <Field label={t("a.caption")}>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t("a.optionalDisplayCaption")}
              />
            </Field>

            {formError && (
              <p className="text-[13px] font-semibold text-drift-error" role="alert">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeUpload}>
                {t("a.cancel")}
              </Button>
              <Button type="submit" disabled={busy || !file}>
                {busy ? t("a.uploading") : t("a.uploadPhoto")}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
