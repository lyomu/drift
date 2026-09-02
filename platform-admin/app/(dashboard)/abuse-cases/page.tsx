"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DefinitionList, DetailRail, ModalShell, RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { AbuseCaseDetailResponse, AbuseCasesResponse, AbuseCaseStatus, AbuseCaseSummary, TrustSafetyPriority } from "@/lib/trust-safety-types";
import { dateTime, label, priorityTone } from "@/lib/trust-safety-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea, statusTone } from "@/components/ui";

export default function AbuseCasesPage() {
  const [status, setStatus] = useState<AbuseCaseStatus | "">("OPEN");
  const [priority, setPriority] = useState<TrustSafetyPriority | "">("");
  const [search, setSearch] = useState("");
  const [cases, setCases] = useState<AbuseCaseSummary[] | null>(null);
  const [detail, setDetail] = useState<AbuseCaseDetailResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase] = useState({ subjectUserId: "", summary: "", priority: "HIGH" as TrustSafetyPriority });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<AbuseCasesResponse>(`/trust-safety/abuse-cases?${params.toString()}`);
      setCases(response.cases);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Abuse cases could not be loaded.");
    }
  }, [priority, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    setError(null);
    try {
      const response = await api.get<AbuseCaseDetailResponse>(`/trust-safety/abuse-cases/${id}`);
      setDetail(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Case detail could not be loaded.");
    }
  }

  async function createCase(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<{ case: AbuseCaseSummary; attachedToExisting: boolean }>("/trust-safety/abuse-cases", newCase);
      setNewCase({ subjectUserId: "", summary: "", priority: "HIGH" });
      setShowCreate(false);
      await load();
      await openDetail(response.case.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The abuse case could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  async function updateCase(action: "ADD_NOTE" | "ESCALATE_PRIORITY" | "SUSPEND" | "CLOSE", priorityValue?: TrustSafetyPriority) {
    if (!detail) return;
    const reason = action === "ESCALATE_PRIORITY"
      ? window.prompt("Priority escalation note", "Pattern review priority changed")
      : window.prompt(action === "SUSPEND" ? "Suspension reason" : action === "CLOSE" ? "Closure reason" : "Case note");
    if (!reason?.trim()) return;
    if (action === "SUSPEND" && !window.confirm(`Suspend ${detail.case.subjectUser.email}? Live sessions will be revoked.`)) return;
    if (action === "CLOSE" && !window.confirm(`Close abuse case for ${detail.case.subjectUser.email}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.patch<AbuseCaseDetailResponse>(`/trust-safety/abuse-cases/${detail.case.id}`, {
        action,
        reason,
        priority: priorityValue,
      });
      setDetail(response);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The case action could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const selectedId = detail?.case.id;
  const detailAccountStatus = detail?.case.subjectUser.accountStatus ?? "UNKNOWN";
  const counts = useMemo(() => ({
    open: cases?.filter((item) => item.status === "OPEN").length ?? 0,
    urgent: cases?.filter((item) => item.priority === "URGENT").length ?? 0,
    closed: cases?.filter((item) => item.status === "CLOSED").length ?? 0,
  }), [cases]);

  return (
    <div>
      <PageHeader
        title="Block / Abuse Cases"
        description="Pattern-level abuse tracking across reports, blocks, and account status actions."
        action={<Button icon="add" onClick={() => setShowCreate(true)}>Open case</Button>}
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Open", value: counts.open, icon: "folder_open", tone: "amber" },
          { label: "Urgent", value: counts.urgent, icon: "priority_high", tone: "red" },
          { label: "Closed", value: counts.closed, icon: "task_alt", tone: "green" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_150px]">
              <Field label="Search"><Input aria-label="Search cases" placeholder="Search user or summary..." value={search} onChange={(event) => { setSearch(event.target.value); setCases(null); }} /></Field>
              <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value as AbuseCaseStatus | ""); setCases(null); }}><option value="OPEN">Open</option><option value="CLOSED">Closed</option></Select></Field>
              <Field label="Priority"><Select value={priority} onChange={(event) => { setPriority(event.target.value as TrustSafetyPriority | ""); setCases(null); }}><option value="">Any priority</option><option value="URGENT">Urgent</option><option value="HIGH">High</option><option value="NORMAL">Normal</option></Select></Field>
            </div>
          </Card>

          {cases === null && !error && <EmptyState message="Loading abuse cases..." />}
          {cases?.length === 0 && <EmptyState message="No open cases" />}
          {cases && cases.length > 0 && (
            <div className="grid gap-3">
              {cases.map((item) => (
                <RowCard key={item.id} selected={selectedId === item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold text-drift-text-primary">{item.summary}</div>
                      <div className="mt-1 text-sm text-drift-text-secondary">{item.subjectUser.name} / {item.subjectUser.email}</div>
                      <div className="mt-2 text-xs font-semibold text-drift-text-secondary">
                        {item.evidenceCounts.playerReports + item.evidenceCounts.messageReports + item.evidenceCounts.clubPostReports} reports / {item.evidenceCounts.blocksReceived} blocks / {item.evidenceCounts.suspensions} status actions
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2"><Badge tone={statusTone(item.status)}>{label(item.status)}</Badge><Badge tone={priorityTone(item.priority)}>{label(item.priority)}</Badge></div>
                      <button className="text-sm font-bold text-drift-primary hover:underline" onClick={() => void openDetail(item.id)}>Open case</button>
                    </div>
                  </div>
                </RowCard>
              ))}
            </div>
          )}
        </div>

        {detail ? (
          <DetailRail
            title={detail.case.subjectUser.name}
            eyebrow="Case detail"
            actions={<div className="flex gap-2"><Badge tone={statusTone(detail.case.status)}>{label(detail.case.status)}</Badge><Badge tone={priorityTone(detail.case.priority)}>{label(detail.case.priority)}</Badge></div>}
          >
            <p className="mb-5 text-sm leading-6 text-drift-text-primary">{detail.case.summary}</p>
            <DefinitionList
              rows={[
                { label: "Email", value: detail.case.subjectUser.email },
                { label: "Account", value: <Badge tone={statusTone(detailAccountStatus)}>{label(detailAccountStatus)}</Badge> },
                { label: "Opened", value: dateTime(detail.case.createdAt) },
                { label: "Updated", value: dateTime(detail.case.updatedAt) },
              ]}
            />
            {detail.case.status === "OPEN" && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" icon="note_add" disabled={busy} onClick={() => void updateCase("ADD_NOTE")}>Add note</Button>
                {detail.case.priority !== "URGENT" && <Button variant="secondary" icon="priority_high" disabled={busy} onClick={() => void updateCase("ESCALATE_PRIORITY", detail.case.priority === "NORMAL" ? "HIGH" : "URGENT")}>Escalate</Button>}
                <Button variant="destructive" icon="block" disabled={busy || detailAccountStatus === "DELETED"} onClick={() => void updateCase("SUSPEND")}>Suspend</Button>
                <Button variant="ghost" icon="task_alt" disabled={busy} onClick={() => void updateCase("CLOSE")}>Close</Button>
              </div>
            )}

            <div className="mt-6 border-t border-drift-border pt-4">
              <h3 className="mb-2 text-[12px] font-bold uppercase text-drift-text-secondary">Case history</h3>
              <div className="flex flex-col gap-3">
                {detail.case.notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-drift-border p-3 text-sm">
                    <div className="font-bold text-drift-text-primary">{label(note.action)}</div>
                    {note.body && <p className="mt-1 text-drift-text-secondary">{note.body}</p>}
                    <div className="mt-1 text-xs font-semibold text-drift-text-secondary">{note.actor.name || note.actor.email} / {dateTime(note.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-drift-border pt-4">
              <h3 className="mb-2 text-[12px] font-bold uppercase text-drift-text-secondary">Evidence</h3>
              <div className="grid gap-2 text-sm text-drift-text-secondary">
                <div>{detail.evidence.playerReports.length} player reports</div>
                <div>{detail.evidence.messageReports.length} message reports</div>
                <div>{detail.evidence.clubPostReports.length} club post reports</div>
                <div>{detail.evidence.blocks.length} blocks received</div>
                <div>{detail.evidence.statusActions.length} suspension / restore actions</div>
              </div>
            </div>
          </DetailRail>
        ) : (
          <Card><EmptyState message="Select a case to view history and evidence." /></Card>
        )}
      </div>

      {showCreate && (
        <ModalShell title="Open case" description="Start a pattern-level abuse case for a user account." onClose={() => setShowCreate(false)}>
          <form onSubmit={createCase} className="flex flex-col gap-4">
            <Field label="Subject user ID"><Input required value={newCase.subjectUserId} onChange={(event) => setNewCase((current) => ({ ...current, subjectUserId: event.target.value }))} /></Field>
            <Field label="Summary"><Textarea required rows={3} value={newCase.summary} onChange={(event) => setNewCase((current) => ({ ...current, summary: event.target.value }))} /></Field>
            <Field label="Priority"><Select value={newCase.priority} onChange={(event) => setNewCase((current) => ({ ...current, priority: event.target.value as TrustSafetyPriority }))}><option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="NORMAL">Normal</option></Select></Field>
            <Button type="submit" icon="add" disabled={busy}>{busy ? "Opening..." : "Open case"}</Button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
