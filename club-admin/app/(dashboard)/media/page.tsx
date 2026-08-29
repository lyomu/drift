"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconChip, MaterialIcon, Panel } from "@/components/dashboard-design";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { MediaAsset } from "@/lib/types";

export default function MediaPage() {
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN" || role === "CONTENT_MANAGER";
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlsRef = useRef<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await api.get<{ assets: MediaAsset[] }>(`/clubs/${clubId}/media`);
      setAssets(res.assets);
      const pairs = await Promise.all(
        res.assets.map(async (asset) => [
          asset.id,
          URL.createObjectURL(await api.blob(`/clubs/${clubId}/media/${asset.id}/content`)),
        ] as const),
      );
      Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
      const nextUrls = Object.fromEntries(pairs);
      urlsRef.current = nextUrls;
      setUrls(nextUrls);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Media could not be loaded. Retry the page.");
    }
  }, [clubId]);

  useEffect(() => {
    void load();
    return () => {
      Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId || !file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (caption) form.append("caption", caption);
      await api.upload(`/clubs/${clubId}/media`, form);
      setFile(null);
      setCaption("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Choose the image and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!clubId) return;
    try {
      await api.delete(`/clubs/${clubId}/media/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The image could not be deleted.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Club imagery used across announcements, events, and public surfaces."
      />
      <ErrorBanner message={error} />

      {canManage && (
        <Panel className="mb-6">
          <form onSubmit={upload} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <Field label="Image">
              <Input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Caption">
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional display caption" />
            </Field>
            <Button type="submit" disabled={busy}>
              <MaterialIcon name="upload" className="text-[18px]" />
              {busy ? "Uploading..." : "Upload photo"}
            </Button>
          </form>
        </Panel>
      )}

      {assets === null ? (
        <EmptyState message="Loading..." />
      ) : assets.length === 0 ? (
        <EmptyState message="Upload your first photo" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <Panel key={asset.id} className="overflow-hidden p-0">
              <div className="aspect-[4/3] bg-drift-neutral-surface">
                {urls[asset.id] ? (
                  <img
                    src={urls[asset.id]}
                    alt={asset.caption ?? asset.filename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <IconChip icon="image" tone="neutral" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-drift-text-primary">
                    {asset.caption || asset.filename}
                  </div>
                  <div className="mt-1 text-xs text-drift-text-secondary">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => void remove(asset.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-drift-text-secondary hover:bg-drift-error-surface hover:text-drift-error"
                    aria-label="Delete image"
                  >
                    <MaterialIcon name="delete" className="text-[18px]" />
                  </button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
