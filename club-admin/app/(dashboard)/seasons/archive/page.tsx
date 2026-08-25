"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

type ArchivedSeason = { id: string; label: string; completedAt: string | null; cancelledAt: string | null; league: { id: string; name: string }; standings: { userId: string; rank: number; points: number; wins: number; losses: number; user: { firstName: string | null; lastName: string | null } }[]; awards: { id: string; title: string; notes: string | null; recipient: { firstName: string | null; lastName: string | null } }[] };

export default function SeasonArchivePage() {
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [seasons, setSeasons] = useState<ArchivedSeason[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState(""); const [title, setTitle] = useState(""); const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!clubId) return; try { setSeasons((await api.get<{ seasons: ArchivedSeason[] }>(`/clubs/${clubId}/seasons/archive`)).seasons); } catch (err) { setError(err instanceof ApiError ? err.message : "Archive could not be loaded."); } }, [clubId]);
  useEffect(() => { void load(); }, [load]);
  async function award(e: React.FormEvent, seasonId: string) { e.preventDefault(); try { await api.post(`/seasons/${seasonId}/awards`, { recipientId, title, notes: notes || undefined }); setRecipientId(""); setTitle(""); setNotes(""); await load(); } catch (err) { setError(err instanceof ApiError ? err.message : "The award could not be issued."); } }
  return <div><PageHeader title="Season archive & awards" description="Review final standings and recognise completed-season achievements." /><ErrorBanner message={error} />{seasons === null ? <EmptyState message="Loading…" /> : seasons.length === 0 ? <EmptyState message="No completed seasons yet" /> : <div className="flex flex-col gap-4">{seasons.map((season) => <Card key={season.id}><button className="flex w-full items-center justify-between text-left" onClick={() => setOpenId(openId === season.id ? null : season.id)}><div><div className="font-semibold text-drift-text-primary">{season.league.name} · {season.label}</div><div className="mt-1 text-sm text-drift-text-secondary">{season.standings.length} final standings · {season.awards.length} awards</div></div><StatusBadge status={season.cancelledAt ? "CANCELLED" : "COMPLETED"} /></button>{openId === season.id && <div className="mt-5 border-t border-drift-border pt-5"><DataTable rows={season.standings} rowKey={(s) => s.userId} emptyMessage="No final standings were recorded." columns={[{ header: "Rank", cell: (s) => s.rank }, { header: "Player", cell: (s) => `${s.user.firstName ?? ""} ${s.user.lastName ?? ""}`.trim() || "—" }, { header: "Points", cell: (s) => s.points }, { header: "W-L", cell: (s) => `${s.wins}-${s.losses}` }]} />{season.awards.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{season.awards.map((a) => <span key={a.id} className="rounded-md bg-drift-primary-light px-3 py-2 text-sm font-semibold text-drift-primary-dark">{a.title} · {`${a.recipient.firstName ?? ""} ${a.recipient.lastName ?? ""}`.trim()}</span>)}</div>}{canManage && season.standings.length > 0 && <form onSubmit={(e) => void award(e, season.id)} className="mt-5 grid grid-cols-1 gap-3 border-t border-drift-border pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]"><Field label="Recipient"><Select required value={recipientId} onChange={(e) => setRecipientId(e.target.value)}><option value="">Select player</option>{season.standings.map((s) => <option key={s.userId} value={s.userId}>{`${s.user.firstName ?? ""} ${s.user.lastName ?? ""}`.trim()}</option>)}</Select></Field><Field label="Award"><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Season champion" /></Field><Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field><Button type="submit" className="self-end">Issue award</Button></form>}</div>}</Card>)}</div>}</div>;
}
