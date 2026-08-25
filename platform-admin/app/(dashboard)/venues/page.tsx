"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { Venue } from "@/lib/venue-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

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

  useEffect(() => { void load(); }, [load]);

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
        action={<Link href="/venues/new" className="inline-flex min-h-10 items-center rounded-md bg-drift-primary px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-drift-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1">Add venue</Link>}
      />
      <ErrorBanner message={error} />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_200px_180px]">
          <Input aria-label="Search venues" placeholder="Search name, address, club, or Place ID…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select aria-label="Verification status" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="">Any verification</option><option value="UNVERIFIED">Unverified</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option></Select>
          <Select aria-label="Places sync status" value={placesSync} onChange={(event) => setPlacesSync(event.target.value)}><option value="">Any sync state</option><option value="SYNCED">Synced</option><option value="STALE">Stale</option><option value="FAILED">Failed</option></Select>
        </div>
      </Card>

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-drift-primary/30 bg-drift-primary-light px-4 py-3">
          <span className="text-sm font-semibold text-drift-primary-dark">{selected.length} venue{selected.length === 1 ? "" : "s"} selected</span>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => void runBulk("VERIFY")}>Mark verified</Button><Button variant="secondary" disabled={busy} onClick={() => void runBulk("UNVERIFY")}>Mark unverified</Button><Button variant="secondary" disabled={busy} onClick={() => void runBulk("MARK_PLACES_STALE")}>Queue enrichment refresh</Button></div>
        </div>
      )}

      {rows === null && !error && <EmptyState message="Loading venues…" />}
      {rows?.length === 0 && <EmptyState message="No venues match these filters." />}
      {rows && rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px]">
            <thead><tr><Th className="w-12"><span className="sr-only">Select</span></Th><Th>Venue</Th><Th>Ownership</Th><Th>Courts</Th><Th>Verification</Th><Th>Places</Th><Th>Updated</Th><Th className="text-right">Action</Th></tr></thead>
            <tbody>
              {rows.map((venue) => (
                <tr key={venue.id}>
                  <Td><input aria-label={`Select ${venue.name}`} type="checkbox" checked={selected.includes(venue.id)} onChange={() => toggle(venue.id)} /></Td>
                  <Td><div className="font-semibold">{venue.name}</div><div className="max-w-xs truncate text-xs text-drift-text-secondary" title={venue.address ?? undefined}>{venue.address ?? "Address unknown"}</div></Td>
                  <Td>{venue.club?.name ?? "Independent"}</Td>
                  <Td>{venue.courtGroups.reduce((sum, group) => sum + group.count, 0)}<div className="text-xs text-drift-text-secondary">{venue.courtGroups.length || "No"} group{venue.courtGroups.length === 1 ? "" : "s"}</div></Td>
                  <Td><Badge tone={statusTone(venue.verificationStatus)}>{venue.verificationStatus}</Badge></Td>
                  <Td><Badge tone={statusTone(venue.placesSyncStatus)}>{venue.placesSyncStatus}</Badge>{!venue.googlePlacesRef && <div className="mt-1 text-xs text-drift-text-secondary">No Place ID</div>}</Td>
                  <Td>{new Date(venue.updatedAt).toLocaleDateString()}</Td>
                  <Td className="text-right"><Link href={`/venues/${venue.id}`} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Open venue</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </Card>
      )}
    </div>
  );
}
