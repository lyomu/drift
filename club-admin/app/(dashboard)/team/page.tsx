"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { ClubRole, Member } from "@/lib/types";

const ADMIN_ROLES: ClubRole[] = ["OWNER", "ADMIN", "COMPETITION_MANAGER", "COACH", "CONTENT_MANAGER", "READ_ONLY"];

export default function TeamPage() {
  const { clubId, role } = useClub(); const canManage = role === "OWNER" || role === "ADMIN";
  const [members, setMembers] = useState<Member[] | null>(null); const [email, setEmail] = useState(""); const [inviteRole, setInviteRole] = useState<ClubRole>("ADMIN"); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!clubId) return; try { setMembers((await api.get<{ members: Member[] }>(`/clubs/${clubId}/members`)).members); } catch (err) { setError(err instanceof ApiError ? err.message : "Team roles could not be loaded."); } }, [clubId]);
  useEffect(() => { void load(); }, [load]);
  async function invite(e: React.FormEvent) { e.preventDefault(); if (!clubId) return; try { await api.post(`/clubs/${clubId}/members`, { email, role: inviteRole }); setEmail(""); await load(); } catch (err) { setError(err instanceof ApiError ? err.message : "The administrator could not be invited."); } }
  async function change(id: string, nextRole: ClubRole) { if (!clubId) return; try { await api.patch(`/clubs/${clubId}/members/${id}`, { role: nextRole }); await load(); } catch (err) { setError(err instanceof ApiError ? err.message : "The role could not be changed."); } }
  async function remove(id: string) { if (!clubId) return; try { await api.delete(`/clubs/${clubId}/members/${id}`); await load(); } catch (err) { setError(err instanceof ApiError ? err.message : "The administrator could not be removed."); } }
  const team = members?.filter((member) => member.role !== "READ_ONLY") ?? [];
  return <div><PageHeader title="Team roles" description="Invite administrators and keep operational access aligned with each person’s responsibilities." /><ErrorBanner message={error} />{canManage && <Card className="mb-6"><form onSubmit={invite} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"><Field label="Existing Drift account email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Field label="Role"><Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as ClubRole)}>{ADMIN_ROLES.filter((r) => r !== "READ_ONLY").map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</Select></Field><Button type="submit">Invite admin</Button></form></Card>}{members === null ? <EmptyState message="Loading…" /> : <DataTable rows={team} rowKey={(m) => m.membershipId} emptyMessage="No administrators have been added." columns={[{ header: "Name", cell: (m) => `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email }, { header: "Role", cell: (m) => canManage ? <Select value={m.role} onChange={(e) => void change(m.membershipId, e.target.value as ClubRole)} className="max-w-[210px]">{ADMIN_ROLES.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</Select> : m.role.replaceAll("_", " ") }, { header: "Status", cell: (m) => <StatusBadge status={m.status} /> }, { header: "", cell: (m) => canManage ? <Button variant="ghost" onClick={() => void remove(m.membershipId)}>Remove admin</Button> : null }]} />}</div>;
}
