"use client";

import { useCallback, useEffect, useState } from "react";
import { RowCard } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
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
        <div className="flex flex-col gap-4">
          {rows.map((dispute) => {
            const a = dispute.match.participants.find((p) => p.side === "A");
            const b = dispute.match.participants.find((p) => p.side === "B");
            return (
              <RowCard key={dispute.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="error">DISPUTED</Badge>
                  <span className="text-xs text-drift-text-secondary">
                    disputed {new Date(dispute.disputedAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-drift-border bg-drift-neutral-surface p-3">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
                      Submitted version
                    </div>
                    <div className="mt-1 text-sm text-drift-text-primary">
                      {nameOf(a)} vs {nameOf(b)}
                    </div>
                    <div className="mt-1 font-display text-lg font-bold text-drift-text-primary">
                      {setsText(dispute.sets)}
                    </div>
                    <div className="mt-0.5 text-xs text-drift-text-secondary">
                      submitted by {nameOf(a)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-drift-border bg-drift-neutral-surface p-3">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
                      Disputing version
                    </div>
                    <div className="mt-1 text-sm text-drift-text-primary">
                      {nameOf(b)} claims the win
                    </div>
                    <div className="mt-1 font-display text-lg font-bold text-drift-text-primary">
                      {setsText(dispute.disputantSets)}
                    </div>
                    <div className="mt-0.5 text-xs text-drift-text-secondary">
                      disputed by {nameOf(b)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button icon="gavel" disabled={busyId === dispute.matchId} onClick={() => rule(dispute.matchId, "SUBMITTED")}>
                    Uphold submitted version
                  </Button>
                  <Button icon="rule" variant="secondary" disabled={busyId === dispute.matchId} onClick={() => rule(dispute.matchId, "DISPUTANT")}>
                    Uphold disputing version
                  </Button>
                </div>
              </RowCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
