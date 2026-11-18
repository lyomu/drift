"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, ErrorBanner, PasswordField } from "@/components/ui";
import { SectionHeader } from "../section-header";

type CoachStatus = {
  provider: "deepseek";
  model: string;
  configured: boolean;
  enabled: boolean;
  updatedAt: string | null;
};

export default function AiCoachSettingsPage() {
  const [status, setStatus] = useState<CoachStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void api.get<CoachStatus>("/coach-ai")
      .then(setStatus)
      .catch((err) => setError(err instanceof ApiError ? err.message : "AI Coach settings could not be loaded."));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!key.trim()) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      setStatus(await api.post<CoachStatus>("/coach-ai/key", { apiKey: key.trim() }));
      setKey("");
      setNotice("DeepSeek is enabled for new AI Coach requests. Use Test connection to verify the key.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The key could not be saved.");
    } finally { setBusy(false); }
  }

  async function toggle() {
    if (!status) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      setStatus(await api.patch<CoachStatus>("/coach-ai/enabled", { enabled: !status.enabled }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI Coach could not be updated.");
    } finally { setBusy(false); }
  }

  async function testConnection() {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.post("/coach-ai/test", {});
      setNotice("DeepSeek responded successfully. AI Coach is ready in the app.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "DeepSeek did not respond. Check the key and try again.");
    } finally { setBusy(false); }
  }

  return <div>
    <SectionHeader title="AI Coach" description="Enter a DeepSeek API key to generate coaching tips from Swing Check and completed match analysis." />
    <ErrorBanner message={error} />
    {notice && <div role="status" className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm text-drift-success">{notice}</div>}
    {!status && !error && <EmptyState message="Loading AI Coach settings..." />}
    {status && <Card className="max-w-2xl p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold text-drift-text-primary">DeepSeek</h3>
        <Badge tone={status.enabled ? "success" : "neutral"}>{status.enabled ? "Active" : status.configured ? "Paused" : "Not configured"}</Badge>
      </div>
      <p className="mb-5 text-sm leading-6 text-drift-text-secondary">
        Model: {status.model}. The key stays on the backend and is never shown again. Adding a new key replaces the old one and enables coaching immediately.
      </p>
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <PasswordField label={status.configured ? "Replace DeepSeek API key" : "DeepSeek API key"} value={key} onChange={(event) => setKey(event.target.value)} autoComplete="off" required />
        <Button type="submit" icon="key" disabled={busy || !key.trim()}>{busy ? "Working..." : status.configured ? "Replace key" : "Save key"}</Button>
      </form>
      {status.configured && <div className="mt-6 flex flex-wrap gap-3 border-t border-drift-border pt-5">
        <Button type="button" variant="secondary" disabled={busy || !status.enabled} onClick={() => void testConnection()}>Test connection</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void toggle()}>{status.enabled ? "Pause AI Coach" : "Enable AI Coach"}</Button>
      </div>}
      <p className="mt-5 text-xs text-drift-text-secondary">Last updated: {status.updatedAt ? new Date(status.updatedAt).toLocaleString() : "Never"}</p>
    </Card>}
  </div>;
}
