"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ActionLink, RowCard } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { Venue } from "@/lib/venue-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, plural, Select, statusTone } from "@/components/ui";

export default function VenueDatabasePage() {
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("");
  const [placesSync, setPlacesSync] = useState("");
  const [rows, setRows] = useState<Venue[] | null>(null);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ take: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (verification) params.set("verification", verification);
      if (placesSync) params.set("placesSync", placesSync);
      const response = await api.get<{ total: number; venues: Venue[] }>(`/venues?${params.toString()}`);
      setRows(response.venues);
      setTotal(response.total);
      setSelected((current) => current.filter((id) => response.venues.some((venue) => venue.id === id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The venue database could not be loaded.");
    }
  }, [placesSync, search, verification]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function runBulk(action: "VERIFY" | "UNVERIFY" | "MARK_PLACES_STALE") {
    if (selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/venues/bulk", { ids: selected, action });
      setSelected([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The bulk venue action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Venue database"
        description="Every court and venue record used across discovery, clubs, matches, and platform operations."
        action={<ActionLink href="/venues/new" icon="add_location_alt" variant="primary">Add venue</ActionLink>}
      />
      <ErrorBanner message={error} />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_200px_180px]">
          <Field label="Search"><Input aria-label="Search venues" placeholder="Search name, address, club, or Place ID..." value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
          <Field label="Verification"><Select aria-label="Verification status" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="">Any verification</option><option value="UNVERIFIED">Unverified</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option></Select></Field>
          <Field label="Places"><Select aria-label="Places sync status" value={placesSync} onChange={(event) => setPlacesSync(event.target.value)}><option value="">Any sync state</option><option value="SYNCED">Synced</option><option value="STALE">Stale</option><option value="FAILED">Failed</option></Select></Field>
        </div>
      </Card>

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-drift-primary/30 bg-drift-primary-light px-4 py-3">
          <span className="text-sm font-bold text-drift-primary-dark">{selected.length} venue{selected.length === 1 ? "" : "s"} selected</span>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" icon="verified" disabled={busy} onClick={() => void runBulk("VERIFY")}>Mark verified</Button><Button variant="secondary" icon="remove_done" disabled={busy} onClick={() => void runBulk("UNVERIFY")}>Mark unverified</Button><Button variant="secondary" icon="sync" disabled={busy} onClick={() => void runBulk("MARK_PLACES_STALE")}>Queue refresh</Button></div>
        </div>
      )}

      {rows === null && !error && <EmptyState message="Loading venues..." />}
      {rows?.length === 0 && <EmptyState message="No venues match these filters." />}
      {rows && rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((venue) => {
            const courtCount = venue.courtGroups.reduce((sum, group) => sum + group.count, 0);
            return (
              <RowCard key={venue.id} selected={selected.includes(venue.id)}>
                <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1.4fr)_1fr_110px_220px_auto] lg:items-center">
                  <input aria-label={`Select ${venue.name}`} type="checkbox" checked={selected.includes(venue.id)} onChange={() => toggle(venue.id)} className="h-4 w-4" />
                  <div className="min-w-0">
                    <div className="font-bold text-drift-text-primary">{venue.name}</div>
                    <div className="truncate text-xs text-drift-text-secondary" title={venue.address ?? undefined}>{venue.address ?? "Address unknown"}</div>
                  </div>
                  <div className="text-sm text-drift-text-primary">{venue.club?.name ?? "Independent"}</div>
                  <div className="text-sm font-bold tabular">{courtCount}<div className="text-xs font-semibold text-drift-text-secondary">{venue.courtGroups.length || "No"} {plural(venue.courtGroups.length, "group")}</div></div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={statusTone(venue.verificationStatus)}>{venue.verificationStatus}</Badge>
                    <Badge tone={statusTone(venue.placesSyncStatus)}>{venue.placesSyncStatus}</Badge>
                  </div>
                  <Link href={`/venues/${venue.id}`} className="justify-self-start font-bold text-drift-primary hover:underline lg:justify-self-end">Open venue</Link>
                </div>
              </RowCard>
            );
          })}
          <div className="px-1 text-xs font-semibold text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </div>
      )}
    </div>
  );
}
