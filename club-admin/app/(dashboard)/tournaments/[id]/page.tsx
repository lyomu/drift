"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";

type Entry = { id: string; seed: number | null; user: { id: string; firstName: string | null; lastName: string | null } };
type Fixture = { id: string; slotIndex: number; isBye: boolean; sideA: Entry["user"] | null; sideB: Entry["user"] | null; match: { id: string; state: string } | null };
type TournamentDetail = { id: string; name: string; state: string; drawSize: number; registrationClosesAt: string; entries: Entry[]; rounds: { id: string; index: number; fixtures: Fixture[] }[] };

export default function TournamentDrawPage() {
  const { id } = useParams<{ id: string }>(); const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [tournament, setTournament] = useState<TournamentDetail | null>(null); const [seeds, setSeeds] = useState<Record<string, number>>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!clubId) return; try { const res = await api.get<{ tournament: TournamentDetail }>(`/clubs/${clubId}/tournaments/${id}`); setTournament(res.tournament); setSeeds(Object.fromEntries(res.tournament.entries.map((entry, index) => [entry.id, entry.seed ?? index + 1]))); } catch (err) { setError(err instanceof ApiError ? err.message : "The draw could not be loaded."); } }, [clubId, id]);
  useEffect(() => { void load(); }, [load]);
  async function saveSeeds() { if (!clubId || !tournament) return; setBusy(true); try { await api.patch(`/clubs/${clubId}/tournaments/${id}/seeds`, { entries: tournament.entries.map((entry) => ({ entryId: entry.id, seed: seeds[entry.id] })) }); await load(); } catch (err) { setError(err instanceof ApiError ? err.message : "Seeding could not be saved."); } finally { setBusy(false); } }
  async function generate() { if (!clubId) return; setBusy(true); try { await api.post(`/clubs/${clubId}/tournaments/${id}/generate-draw`); await load(); } catch (err) { setError(err instanceof ApiError ? err.message : "Draw generation failed."); } finally { setBusy(false); } }
  if (!tournament) return <div><ErrorBanner message={error} /><EmptyState message="Loading…" /></div>;
  const preDraw = tournament.state === "DRAFT" || tournament.state === "REGISTRATION_OPEN";
  return <div><PageHeader title={tournament.name} description={`${tournament.entries.length}/${tournament.drawSize} entries · registration closes ${new Date(tournament.registrationClosesAt).toLocaleString()}`} action={<StatusBadge status={tournament.state} />} /><ErrorBanner message={error} />{preDraw ? <Card><div className="mb-4"><h2 className="font-display text-lg font-bold text-drift-text-primary">Manual seeding</h2><p className="mt-1 text-sm text-drift-text-secondary">Assign each player a unique seed before generating the bracket.</p></div><DataTable rows={tournament.entries} rowKey={(e) => e.id} emptyMessage="Generate the draw once registration closes" columns={[{ header: "Player", cell: (e) => `${e.user.firstName ?? ""} ${e.user.lastName ?? ""}`.trim() || "Player" }, { header: "Seed", cell: (e) => <Select disabled={!canManage} value={seeds[e.id]} onChange={(event) => setSeeds({ ...seeds, [e.id]: Number(event.target.value) })} className="max-w-28">{tournament.entries.map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</Select> }]} />{canManage && tournament.entries.length >= 2 && <div className="mt-5 flex gap-3"><Button variant="secondary" disabled={busy} onClick={() => void saveSeeds()}>Save seeding</Button><Button disabled={busy} onClick={() => void generate()}>{busy ? "Working…" : "Generate draw"}</Button></div>}</Card> : tournament.rounds.length === 0 ? <EmptyState message="The bracket is being prepared." /> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{tournament.rounds.map((round) => <Card key={round.id}><h2 className="mb-4 font-display text-lg font-bold text-drift-text-primary">Round {round.index}</h2><div className="flex flex-col gap-3">{round.fixtures.map((fixture) => <div key={fixture.id} className="rounded-md border border-drift-border px-3 py-3"><div className="flex items-center justify-between gap-2 text-sm"><span className="font-semibold text-drift-text-primary">{fixture.sideA ? `${fixture.sideA.firstName ?? ""} ${fixture.sideA.lastName ?? ""}`.trim() : "TBD"}</span>{fixture.match && <StatusBadge status={fixture.match.state} />}</div><div className="my-1 text-xs text-drift-text-secondary">vs</div><div className="text-sm font-semibold text-drift-text-primary">{fixture.isBye ? "Bye" : fixture.sideB ? `${fixture.sideB.firstName ?? ""} ${fixture.sideB.lastName ?? ""}`.trim() : "TBD"}</div></div>)}</div></Card>)}</div>}</div>;
}
