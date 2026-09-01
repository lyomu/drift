"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

type ArchivedLeague = {
  id: string;
  name: string;
  completedAt: string | null;
  cancelledAt: string | null;
  standings: { userId: string; rank: number; points: number; wins: number; losses: number; user: { firstName: string | null; lastName: string | null } }[];
  awards: { id: string; title: string; notes: string | null; recipient: { firstName: string | null; lastName: string | null } }[];
};

export default function LeagueArchivePage() {
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [leagues, setLeagues] = useState<ArchivedLeague[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      setLeagues(
        (await api.get<{ leagues: ArchivedLeague[] }>(`/clubs/${clubId}/leagues/archive`)).leagues,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Archive could not be loaded.");
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function award(e: React.FormEvent, leagueId: string) {
    e.preventDefault();
    try {
      await api.post(`/leagues/${leagueId}/awards`, {
        recipientId,
        title,
        notes: notes || undefined,
      });
      setRecipientId("");
      setTitle("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The award could not be issued.");
    }
  }

  return (
    <div>
      <PageHeader
        title="League archive & awards"
        description="Review final standings and recognise completed-league achievements."
      />
      <ErrorBanner message={error} />
      {leagues === null ? (
        <EmptyState message="Loading…" />
      ) : leagues.length === 0 ? (
        <EmptyState message="No completed leagues yet" />
      ) : (
        <div className="flex flex-col gap-4">
          {leagues.map((league) => (
            <Card key={league.id}>
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setOpenId(openId === league.id ? null : league.id)}
              >
                <div>
                  <div className="font-semibold text-drift-text-primary">{league.name}</div>
                  <div className="mt-1 text-sm text-drift-text-secondary">
                    {league.standings.length} final standings · {league.awards.length} awards
                  </div>
                </div>
                <StatusBadge status={league.cancelledAt ? "CANCELLED" : "COMPLETED"} />
              </button>
              {openId === league.id && (
                <div className="mt-5 border-t border-drift-border pt-5">
                  <DataTable
                    rows={league.standings}
                    rowKey={(s) => s.userId}
                    emptyMessage="No final standings were recorded."
                    columns={[
                      { header: "Rank", cell: (s) => s.rank },
                      {
                        header: "Player",
                        cell: (s) =>
                          `${s.user.firstName ?? ""} ${s.user.lastName ?? ""}`.trim() || "—",
                      },
                      { header: "Points", cell: (s) => s.points },
                      { header: "W-L", cell: (s) => `${s.wins}-${s.losses}` },
                    ]}
                  />
                  {league.awards.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {league.awards.map((a) => (
                        <span
                          key={a.id}
                          className="rounded-md bg-drift-primary-light px-3 py-2 text-sm font-semibold text-drift-primary-dark"
                        >
                          {a.title} · {`${a.recipient.firstName ?? ""} ${a.recipient.lastName ?? ""}`.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  {canManage && league.standings.length > 0 && (
                    <form
                      onSubmit={(e) => void award(e, league.id)}
                      className="mt-5 grid grid-cols-1 gap-3 border-t border-drift-border pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <Field label="Recipient">
                        <Select
                          required
                          value={recipientId}
                          onChange={(e) => setRecipientId(e.target.value)}
                        >
                          <option value="">Select player</option>
                          {league.standings.map((s) => (
                            <option key={s.userId} value={s.userId}>
                              {`${s.user.firstName ?? ""} ${s.user.lastName ?? ""}`.trim()}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Award">
                        <Input
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="League champion"
                        />
                      </Field>
                      <Field label="Notes">
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </Field>
                      <Button type="submit" className="self-end">
                        Issue award
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
