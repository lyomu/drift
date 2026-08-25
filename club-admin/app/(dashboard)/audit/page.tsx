"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Input, PageHeader, Select } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

type AuditRow = { id: string; action: string; entityType: string; entityId: string | null; metadata: unknown; createdAt: string; actor: { id: string; firstName: string | null; lastName: string | null; email: string | null } };

export default function AuditPage() {
  const { clubId } = useClub(); const [logs, setLogs] = useState<AuditRow[] | null>(null); const [action, setAction] = useState(""); const [actorId, setActorId] = useState(""); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!clubId) return; try { const query = new URLSearchParams(); if (action) query.set("action", action); if (actorId) query.set("actorId", actorId); setLogs((await api.get<{ logs: AuditRow[] }>(`/clubs/${clubId}/audit-log?${query}`)).logs); } catch (err) { setError(err instanceof ApiError ? err.message : "The audit log could not be loaded."); } }, [clubId, action, actorId]);
  useEffect(() => { void load(); }, [load]);
  const actors = useMemo(() => Array.from(new Map((logs ?? []).map((log) => [log.actor.id, log.actor])).values()), [logs]);
  function exportCsv() { if (!logs) return; const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`; const csv = ["Timestamp,User,Action,Entity,Entity ID", ...logs.map((log) => [log.createdAt, `${log.actor.firstName ?? ""} ${log.actor.lastName ?? ""}`.trim() || log.actor.email, log.action, log.entityType, log.entityId].map(esc).join(","))].join("\n"); downloadBlob(new Blob([csv], { type: "text/csv" }), "club-audit-log.csv"); }
  return <div><PageHeader title="Club audit log" description="A durable history of consequential club administration actions." action={<Button variant="secondary" disabled={!logs?.length} onClick={exportCsv}>Export CSV</Button>} /><ErrorBanner message={error} /><div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2"><Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action" aria-label="Filter by action" /><Select value={actorId} onChange={(e) => setActorId(e.target.value)} aria-label="Filter by user"><option value="">All users</option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{`${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || actor.email}</option>)}</Select></div>{logs === null ? <EmptyState message="Loading…" /> : <DataTable rows={logs} rowKey={(log) => log.id} emptyMessage="No audited actions yet." columns={[{ header: "When", cell: (log) => new Date(log.createdAt).toLocaleString() }, { header: "User", cell: (log) => `${log.actor.firstName ?? ""} ${log.actor.lastName ?? ""}`.trim() || log.actor.email || "—" }, { header: "Action", cell: (log) => log.action.replaceAll(".", " › ") }, { header: "Entity", cell: (log) => log.entityType }]} />}</div>;
}
