"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import type { Dispute } from "@/lib/types";

export default function DisputesPage() {
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ disputes: Dispute[] }>(
      `/clubs/${clubId}/disputes`,
    );
    setDisputes(res.disputes);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleResolve(
    fixtureId: string,
    ruling: "SUBMITTED" | "DISPUTANT",
  ) {
    setError(null);
    setResolving(fixtureId);
    try {
      await api.patch(`/disputes/${fixtureId}/resolve`, { ruling });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setResolving(null);
    }
  }

  function name(p: Dispute["sideA"]) {
    return p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Player" : "—";
  }

  return (
    <div>
      <PageHeader
        title="Disputes"
        description="Result disputes awaiting a ruling, across all your leagues."
      />
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : disputes.length === 0 ? (
        <EmptyState message="No open disputes." />
      ) : (
        <div className="flex flex-col gap-4">
          {disputes.map((d) => {
            const result = d.match?.result;
            const submittedSide = result?.winningSide;
            const disputantSide = result?.disputantWinningSide;
            return (
              <Card key={d.fixtureId}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-drift-text-primary">
                    {name(d.sideA)} vs {name(d.sideB)}
                  </span>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-md border border-drift-border px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-drift-text-secondary">
                      Original submission
                    </div>
                    <div className="mt-1 text-drift-text-primary">
                      {submittedSide === "A"
                        ? name(d.sideA)
                        : submittedSide === "B"
                          ? name(d.sideB)
                          : "—"}{" "}
                      won
                    </div>
                  </div>
                  <div className="rounded-md border border-drift-border px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-drift-text-secondary">
                      Disputant claims
                    </div>
                    <div className="mt-1 text-drift-text-primary">
                      {disputantSide === "A"
                        ? name(d.sideA)
                        : disputantSide === "B"
                          ? name(d.sideB)
                          : "—"}{" "}
                      won
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      disabled={resolving === d.fixtureId}
                      onClick={() => handleResolve(d.fixtureId, "SUBMITTED")}
                    >
                      Uphold original submission
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={resolving === d.fixtureId}
                      onClick={() => handleResolve(d.fixtureId, "DISPUTANT")}
                    >
                      Side with disputant
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
