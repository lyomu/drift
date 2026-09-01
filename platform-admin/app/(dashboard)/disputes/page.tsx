"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { DataTable } from "@/components/DataTable";
import { Badge, Button, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";

interface DisputeRow {
  id: string;
  matchId: string;
  sets: { sideAGames: number; sideBGames: number }[] | null;
  disputantSets: { sideAGames: number; sideBGames: number }[] | null;
  disputedAt: string;
  match: {
    state: string;
    participants: {
      side: "A" | "B";
      user: { id: string; firstName: string | null; lastName: string | null; email: string };
    }[];
  };
}

function nameOf(p: DisputeRow["match"]["participants"][number] | undefined): string {
  if (!p) return "-";
  return [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || p.user.email;
}

function setsText(sets: DisputeRow["sets"]): string {
  if (!sets || sets.length === 0) return "Walkover / no score";
  return sets.map((s) => `${s.sideAGames}-${s.sideBGames}`).join(", ");
}

export default function DisputesPage() {
  const [rows, setRows] = useState<DisputeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ disputes: DisputeRow[] }>("/disputes");
      setRows(res.disputes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load disputes.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function rule(matchId: string, ruling: "SUBMITTED" | "DISPUTANT") {
    if (
      !window.confirm(
        `Uphold the ${ruling === "SUBMITTED" ? "submitted" : "disputant"} version? This finalises the match and updates ratings.`,
      )
    ) {
      return;
    }
    setBusyId(matchId);
    try {
      await api.post(`/disputes/${matchId}/rule`, { ruling });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ruling failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Disputes"
        description="Every match whose two versions never converged. A platform ruling is final and updates ratings and stats."
      />
      <ErrorBanner message={error} />

      {rows === null && !error && <EmptyState message="Loading..." />}
      {rows?.length === 0 && <EmptyState message="No open disputes." />}

      {rows && rows.length > 0 && (
        <DataTable
          rows={rows}
          rowKey={(dispute) => dispute.id}
          columns={[
            {
              header: "Match",
              cell: (dispute) => {
                const a = dispute.match.participants.find((p) => p.side === "A");
                const b = dispute.match.participants.find((p) => p.side === "B");
                return (
                  <div>
                    <div className="font-bold text-drift-text-primary">
                      {nameOf(a)} vs {nameOf(b)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="error">DISPUTED</Badge>
                      <Badge tone="warning">{dispute.match.state}</Badge>
                    </div>
                  </div>
                );
              },
            },
            {
              header: "Submitted score",
              cell: (dispute) => {
                const a = dispute.match.participants.find((p) => p.side === "A");
                return (
                  <div>
                    <div className="font-display text-base font-bold text-drift-text-primary">
                      {setsText(dispute.sets)}
                    </div>
                    <div className="text-xs text-drift-text-secondary">by {nameOf(a)}</div>
                  </div>
                );
              },
            },
            {
              header: "Disputing score",
              cell: (dispute) => {
                const b = dispute.match.participants.find((p) => p.side === "B");
                return (
                  <div>
                    <div className="font-display text-base font-bold text-drift-text-primary">
                      {setsText(dispute.disputantSets)}
                    </div>
                    <div className="text-xs text-drift-text-secondary">by {nameOf(b)}</div>
                  </div>
                );
              },
            },
            {
              header: "Disputed",
              cell: (dispute) => new Date(dispute.disputedAt).toLocaleString(),
            },
            {
              header: "Actions",
              className: "text-right",
              cell: (dispute) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button icon="gavel" disabled={busyId === dispute.matchId} onClick={() => rule(dispute.matchId, "SUBMITTED")}>
                    Submitted
                  </Button>
                  <Button icon="rule" variant="secondary" disabled={busyId === dispute.matchId} onClick={() => rule(dispute.matchId, "DISPUTANT")}>
                    Disputing
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
