"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Input, PageHeader } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { CourtSummary } from "@/lib/types";

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
          canManage && (
            <Link href="/courts/new">
              <Button>New court</Button>
            </Link>
          )
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <DataTable
          rows={courts}
          rowKey={(c) => c.id}
          emptyMessage="No courts yet."
          columns={[
            {
              header: "Name",
              cell: (c) => (
                <Link
                  href={`/courts/${c.id}`}
                  className="font-semibold text-drift-primary hover:underline"
                >
                  {c.name}
                </Link>
              ),
            },
            { header: "Address", cell: (c) => c.address ?? "—" },
            {
              header: "Verification",
              cell: (c) => <StatusBadge status={c.verificationStatus} />,
            },
          ]}
        />
      )}

      {canManage && (
        <Card className="mt-8">
          <h2 className="mb-1 text-sm font-semibold text-drift-text-primary">
            Claim an existing court
          </h2>
          <p className="mb-3 text-sm text-drift-text-secondary">
            Search independent courts with no club owner and link one to
            this club.
          </p>
          <form onSubmit={handleSearch} className="mb-4 flex gap-3">
            <Input
              value={claimQuery}
              onChange={(e) => setClaimQuery(e.target.value)}
              placeholder="Search by name"
            />
            <Button type="submit" variant="secondary" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </form>
          {claimResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {claimResults.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-drift-border px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-drift-text-primary">
                      {c.name}
                    </div>
                    <div className="text-drift-text-secondary">
                      {c.address ?? "No address on file"}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={claiming === c.id}
                    onClick={() => handleClaim(c.id)}
                  >
                    {claiming === c.id ? "Claiming…" : "Claim"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
