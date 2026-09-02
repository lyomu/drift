"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, ErrorBanner, PageHeader } from "@/components/ui";
import { IconChip, Panel } from "@/components/dashboard-design";
import { Listing } from "@/components/Listing";
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
    return p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Player" : "-";
  }

  function winner(dispute: Dispute, side: "submitted" | "disputant") {
    const result = dispute.match?.result;
    const winningSide =
      side === "submitted" ? result?.winningSide : result?.disputantWinningSide;
    if (winningSide === "A") return `${name(dispute.sideA)} won`;
    if (winningSide === "B") return `${name(dispute.sideB)} won`;
    return "No winning side recorded";
  }

  return (
    <div>
      <PageHeader
        title="Disputes"
        description="Result disputes awaiting a ruling, across all your leagues."
      />
      <ErrorBanner message={error} />

      <Listing
        title="Open disputes"
        count={loading ? null : disputes.length}
        loading={loading}
        empty={{
          icon: "gavel",
          title: "No open disputes",
          description:
            "When a player contests a submitted result, it lands here for an admin ruling.",
        }}
      >
        {disputes.map((dispute) => (
            <Panel key={dispute.fixtureId}>
              <div className="mb-4 flex items-start gap-3">
                <IconChip icon="gavel" tone="error" />
                <div>
                  <h2 className="text-[14.5px] font-bold text-drift-text-primary">
                    {name(dispute.sideA)} vs {name(dispute.sideB)}
                  </h2>
                  <p className="mt-1 text-[12.5px] text-drift-text-secondary">
                    Result dispute awaiting an admin ruling
                  </p>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md border border-drift-border bg-drift-background px-4 py-3">
                  <div className="text-xs font-bold uppercase text-drift-text-secondary">
                    Original submission
                  </div>
                  <div className="mt-1 text-drift-text-primary">
                    {winner(dispute, "submitted")}
                  </div>
                </div>
                <div className="rounded-md border border-drift-warning/20 bg-drift-warning-surface px-4 py-3">
                  <div className="text-xs font-bold uppercase text-drift-warning">
                    Disputant claims
                  </div>
                  <div className="mt-1 text-drift-text-primary">
                    {winner(dispute, "disputant")}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    disabled={resolving === dispute.fixtureId}
                    onClick={() => void handleResolve(dispute.fixtureId, "SUBMITTED")}
                  >
                    Uphold original submission
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={resolving === dispute.fixtureId}
                    onClick={() => void handleResolve(dispute.fixtureId, "DISPUTANT")}
                  >
                    Side with disputant
                  </Button>
                </div>
              )}
            </Panel>
        ))}
      </Listing>
    </div>
  );
}
