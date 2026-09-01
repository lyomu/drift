"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { CourtGroupsEditor } from "@/components/CourtGroupsEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, ModalShell, RowCard } from "@/components/dashboard-design";
import { Listing } from "@/components/Listing";
import type { CourtGroup, CourtSummary } from "@/lib/types";

export default function CourtsPage() {
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [courts, setCourts] = useState<CourtSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimQuery, setClaimQuery] = useState("");
  const [claimResults, setClaimResults] = useState<CourtSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [groups, setGroups] = useState<CourtGroup[]>([
    { surface: "HARD", indoor: false, lighting: false, count: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ courts: CourtSummary[] }>(
      `/clubs/${clubId}/courts`,
    );
    setCourts(res.courts);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!clubId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/clubs/${clubId}/courts`, {
        name,
        address: address || undefined,
        mapsUrl: mapsUrl.trim() || undefined,
        courtGroups: groups,
      });
      setName("");
      setAddress("");
      setMapsUrl("");
      setGroups([{ surface: "HARD", indoor: false, lighting: false, count: 1 }]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const res = await api.get<{ courts: CourtSummary[] }>(
        `/courts?independentOnly=true&search=${encodeURIComponent(claimQuery)}`,
      );
      setClaimResults(res.courts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSearching(false);
    }
  }

  async function handleClaim(courtId: string) {
    if (!clubId) return;
    setError(null);
    setClaiming(courtId);
    try {
      await api.patch(`/clubs/${clubId}/courts/${courtId}/claim`);
      setClaimResults((prev) => prev.filter((c) => c.id !== courtId));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Courts"
        description="Courts this club owns or manages."
        action={
          canManage && <Button onClick={() => setShowForm(true)}>New court</Button>
        }
      />
      <ErrorBanner message={error} />

      <Listing
        title="Courts"
        count={loading ? null : courts.length}
        loading={loading}
        empty={{
          icon: "sports_tennis",
          title: "No courts",
          description:
            "Courts are optional — many clubs don't own any and members find courts themselves. Add a court this club owns, or claim an existing independent listing.",
          action: canManage ? (
            <Button onClick={() => setShowForm(true)}>New court</Button>
          ) : undefined,
        }}
      >
        <div className="flex flex-col">
            {courts.map((court) => (
              <Link href={`/courts/${court.id}`} key={court.id}>
                <RowCard className="flex items-center gap-3.5 p-3.5">
                  <IconChip icon="sports_tennis" tone="info" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-drift-text-primary">
                      {court.name}
                    </div>
                    <div className="truncate text-[12.5px] text-drift-text-secondary">
                      {court.address ?? "No address on file"}
                    </div>
                  </div>
                  <StatusBadge status={court.verificationStatus} />
                </RowCard>
              </Link>
            ))}
        </div>
      </Listing>

      {canManage && (
        <Card className="mt-6">
          <h2 className="mb-1 text-sm font-bold text-drift-text-primary">
            Claim an existing court
          </h2>
          <p className="mb-3 text-sm text-drift-text-secondary">
            Search independent courts with no club owner and link one to this club.
          </p>
          <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={claimQuery}
              onChange={(e) => setClaimQuery(e.target.value)}
              placeholder="Search by name"
            />
            <Button type="submit" variant="secondary" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </form>
          {claimResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {claimResults.map((court) => (
                <RowCard
                  key={court.id}
                  className="flex items-center justify-between gap-3 rounded-md border-drift-border"
                >
                  <div>
                    <div className="font-bold text-drift-text-primary">{court.name}</div>
                    <div className="text-sm text-drift-text-secondary">
                      {court.address ?? "No address on file"}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={claiming === court.id}
                    onClick={() => void handleClaim(court.id)}
                  >
                    {claiming === court.id ? "Claiming..." : "Claim"}
                  </Button>
                </RowCard>
              ))}
            </div>
          )}
        </Card>
      )}

      {showForm && (
        <ModalShell title="New court" size="lg" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="Name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Address / Location">
              <Input value={address} placeholder="Street, area, city" onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="Google Maps link (optional)">
              <Input type="url" inputMode="url" placeholder="https://maps.google.com/…" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
            </Field>
            <CourtGroupsEditor groups={groups} onChange={setGroups} />
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create court"}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
