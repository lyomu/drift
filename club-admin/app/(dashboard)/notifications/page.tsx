"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";

type Settings = { membershipChanges: boolean; competitionUpdates: boolean; eventRegistrations: boolean; moderationAlerts: boolean; weeklyDigest: boolean };
const OPTIONS: { key: keyof Settings; label: string; detail: string }[] = [
  { key: "membershipChanges", label: "Membership changes", detail: "Join requests, approvals, and team access updates." },
  { key: "competitionUpdates", label: "Competition updates", detail: "Registrations, disputes, draws, and season milestones." },
  { key: "eventRegistrations", label: "Event registrations", detail: "New sign-ups, cancellations, and attendance changes." },
  { key: "moderationAlerts", label: "Moderation alerts", detail: "New reports and escalated community content." },
  { key: "weeklyDigest", label: "Weekly digest", detail: "A consolidated operational summary each week." },
];
export default function NotificationSettingsPage() {
  const { clubId } = useClub(); const [settings, setSettings] = useState<Settings | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!clubId) return; api.get<{ settings: Settings }>(`/clubs/${clubId}/notification-settings`).then((r) => setSettings(r.settings)).catch((err) => setError(err instanceof ApiError ? err.message : "Notification defaults could not be loaded.")); }, [clubId]);
  async function save() { if (!clubId || !settings) return; setBusy(true); try { setSettings((await api.patch<{ settings: Settings }>(`/clubs/${clubId}/notification-settings`, settings)).settings); } catch (err) { setError(err instanceof ApiError ? err.message : "Notification defaults could not be saved."); } finally { setBusy(false); } }
  return <div><PageHeader title="Notification settings" description="Choose the default operational alerts sent to club administrators." /><ErrorBanner message={error} />{!settings ? <EmptyState message="Loading…" /> : <Card><div className="divide-y divide-drift-border">{OPTIONS.map((option) => <label key={option.key} className="flex cursor-pointer items-start justify-between gap-5 py-4 first:pt-0 last:pb-0"><div><div className="font-semibold text-drift-text-primary">{option.label}</div><div className="mt-1 text-sm text-drift-text-secondary">{option.detail}</div></div><input type="checkbox" checked={settings[option.key]} onChange={(e) => setSettings({ ...settings, [option.key]: e.target.checked })} className="mt-1 h-5 w-5 accent-drift-primary" /></label>)}</div><Button className="mt-6" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save defaults"}</Button></Card>}</div>;
}
