"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { CurrentPlatformAdmin } from "@/lib/access-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";

interface NewsSettings {
  ingestionPaused: boolean;
  aiEnabled: boolean;
  automaticPublishingEnabled: boolean;
  aiDailyRequestLimit: number;
  aiSummaryMaxCharacters: number;
  retryBaseMinutes: number;
  runRetentionDays: number;
  updatedAt: string;
  aiProvider?: string;
  aiProviderConfigured?: boolean;
  aiRequestsToday?: number;
}

export default function NewsSettingsPage() {
  const [settings, setSettings] = useState<NewsSettings | null>(null);
  const [draft, setDraft] = useState<NewsSettings | null>(null);
  const [canConfigure, setCanConfigure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([api.get<NewsSettings>("/news/settings"), api.get<CurrentPlatformAdmin>("/auth/me")])
      .then(([value, admin]) => {
        setSettings(value); setDraft(value);
        setCanConfigure(admin.role.permissions.includes("CONTENT_MANAGE") && admin.role.permissions.includes("PLATFORM_CONFIG_MANAGE"));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load News settings."));
  }, []);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await api.patch<NewsSettings>("/news/settings", {
        ingestionPaused: draft.ingestionPaused,
        aiEnabled: draft.aiEnabled,
        automaticPublishingEnabled: draft.automaticPublishingEnabled,
        aiDailyRequestLimit: draft.aiDailyRequestLimit,
        aiSummaryMaxCharacters: draft.aiSummaryMaxCharacters,
        retryBaseMinutes: draft.retryBaseMinutes,
        runRetentionDays: draft.runRetentionDays,
      });
      const value = await api.get<NewsSettings>("/news/settings");
      setSettings(value); setDraft(value); setError(null);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Could not save News settings."); }
    finally { setBusy(false); }
  }

  return <div>
    <PageHeader title="News Settings" description="Control RSS ingestion, optional AI processing, and automatic publication." />
    <ErrorBanner message={error} />
    {!draft && !error && <EmptyState message="Loading settings..." />}
    {draft && <Card className="max-w-2xl p-6">
      <div className="mb-5 flex items-center gap-2"><h2 className="text-lg font-bold text-drift-text-primary">Processing controls</h2><Badge tone={draft.ingestionPaused ? "warning" : "success"}>{draft.ingestionPaused ? "Paused" : "Running"}</Badge></div>
      <p className="mb-5 text-sm text-drift-text-secondary">Provider: {settings?.aiProvider ?? "disabled"} ({settings?.aiProviderConfigured ? "configured" : "unavailable"}) · Requests today: {settings?.aiRequestsToday ?? 0}/{draft.aiDailyRequestLimit}</p>
      <div className="grid gap-5">
        <label className="flex items-start gap-3 text-sm text-drift-text-primary"><input type="checkbox" disabled={!canConfigure} checked={draft.ingestionPaused} onChange={(e) => setDraft({ ...draft, ingestionPaused: e.target.checked })} /><span><strong>Pause RSS ingestion</strong><span className="block text-drift-text-secondary">Stops scheduled and manual imports. Published stories stay visible until unpublished or rights are revoked.</span></span></label>
        <label className="flex items-start gap-3 text-sm text-drift-text-primary"><input type="checkbox" disabled={!canConfigure} checked={draft.aiEnabled} onChange={(e) => setDraft({ ...draft, aiEnabled: e.target.checked, automaticPublishingEnabled: e.target.checked ? draft.automaticPublishingEnabled : false })} /><span><strong>Enable AI assistance</strong><span className="block text-drift-text-secondary">Requires a server side provider key and source permission for AI processing. Provider failures leave stories in review.</span></span></label>
        <label className="flex items-start gap-3 text-sm text-drift-text-primary"><input type="checkbox" disabled={!canConfigure || !draft.aiEnabled} checked={draft.automaticPublishingEnabled} onChange={(e) => setDraft({ ...draft, automaticPublishingEnabled: e.target.checked })} /><span><strong>Enable automatic publishing globally</strong><span className="block text-drift-text-secondary">Each source must separately use Auto mode and have documented automation permission. Only clean, high confidence tennis items qualify.</span></span></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="AI requests per UTC day"><Input type="number" min={1} max={1000} disabled={!canConfigure} value={draft.aiDailyRequestLimit} onChange={(e) => setDraft({ ...draft, aiDailyRequestLimit: Number(e.target.value) })} /></Field>
          <Field label="AI summary character limit"><Input type="number" min={80} max={300} disabled={!canConfigure} value={draft.aiSummaryMaxCharacters} onChange={(e) => setDraft({ ...draft, aiSummaryMaxCharacters: Number(e.target.value) })} /></Field>
          <Field label="Retry base (minutes)"><Input type="number" min={15} max={120} disabled={!canConfigure} value={draft.retryBaseMinutes} onChange={(e) => setDraft({ ...draft, retryBaseMinutes: Number(e.target.value) })} /></Field>
          <Field label="Ingestion history retention (days)"><Input type="number" min={7} max={365} disabled={!canConfigure} value={draft.runRetentionDays} onChange={(e) => setDraft({ ...draft, runRetentionDays: Number(e.target.value) })} /></Field>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3"><span className="text-xs text-drift-text-secondary">Last saved {settings ? new Date(settings.updatedAt).toLocaleString() : "never"}</span>{canConfigure && <Button disabled={busy} onClick={() => void save()}>{busy ? "Saving..." : "Save settings"}</Button>}</div>
    </Card>}
  </div>;
}
