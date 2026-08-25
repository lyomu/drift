"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { PlacesSyncReport } from "@/lib/venue-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Td, Th, statusTone } from "@/components/ui";

export default function PlacesSyncPage() {
  const [report, setReport] = useState<PlacesSyncReport | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await api.get<PlacesSyncReport>("/venues/places-sync"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google Places sync status could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function sync(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const result = await api.post<{ status: "SYNCED" | "FAILED"; error?: string }>(`/venues/${id}/places-sync`);
      if (result.status === "FAILED") setError(result.error ?? "Google Places sync failed.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google Places sync failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Google Places sync status" description="Provider health and enrichment freshness for every venue record." action={<Button variant="secondary" onClick={() => void load()}>Refresh status</Button>} />
      <ErrorBanner message={error} />
      {!report && !error && <EmptyState message="Loading sync status…" />}

      {report && (
        <>
          {!report.integration.configured && (
            <div className="mb-5 rounded-md border border-drift-warning/30 bg-drift-warning-surface px-4 py-3 text-sm leading-6 text-drift-warning">
              Google Places is not configured. Add <strong>GOOGLE_PLACES_API_KEY</strong> to the backend environment before forcing a sync; failed attempts will remain visible with this exact reason.
            </div>
          )}
          <Card className="mb-5 overflow-hidden p-0">
            <dl className="grid sm:grid-cols-3">
              {[
                ["Synced", report.integration.counts.synced, "Fresh within 30 days"],
                ["Stale", report.integration.counts.stale, "Needs a provider refresh"],
                ["Failed", report.integration.counts.failed, "Open the recorded error"],
              ].map(([label, count, note], index) => (
                <div key={String(label)} className={`px-5 py-5 ${index > 0 ? "border-t border-drift-border sm:border-l sm:border-t-0" : ""}`}>
                  <dt className="text-sm font-semibold text-drift-text-secondary">{label}</dt>
                  <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-drift-text-primary">{count}</dd>
                  <div className="mt-1 text-xs text-drift-text-secondary">{note}</div>
                </div>
              ))}
            </dl>
          </Card>
          <p className="mb-3 text-xs text-drift-text-secondary">Latest successful sync: {report.integration.latestSuccess ? new Date(report.integration.latestSuccess).toLocaleString() : "No successful sync yet"}</p>

          {report.venues.length === 0 ? (
            <EmptyState message="No venues are available for enrichment." />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px]">
                <thead><tr><Th>Venue</Th><Th>Place ID</Th><Th>Status</Th><Th>Last success</Th><Th>Error detail</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {report.venues.map((venue) => (
                    <tr key={venue.id}>
                      <Td><Link href={`/venues/${venue.id}`} className="font-semibold text-drift-primary hover:underline">{venue.name}</Link><div className="max-w-xs truncate text-xs text-drift-text-secondary">{venue.address ?? "Address unknown"}</div></Td>
                      <Td>{venue.googlePlacesRef ?? <span className="text-drift-text-secondary">Not linked</span>}</Td>
                      <Td><Badge tone={statusTone(venue.syncStatus)}>{venue.syncStatus}</Badge></Td>
                      <Td>{venue.googlePlacesSyncedAt ? new Date(venue.googlePlacesSyncedAt).toLocaleString() : "Never"}</Td>
                      <Td><span className={venue.googlePlacesSyncError ? "text-drift-error" : "text-drift-text-secondary"}>{venue.googlePlacesSyncError ?? "—"}</span></Td>
                      <Td className="text-right"><Button variant="secondary" disabled={busyId === venue.id} onClick={() => void sync(venue.id)}>{busyId === venue.id ? "Syncing…" : "Force re-sync"}</Button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
