"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { QueueState, ReportType, ReportedContentItem, ReportedContentResponse, TrustSafetyPriority } from "@/lib/trust-safety-types";
import { dateTime, label, priorityTone } from "@/lib/trust-safety-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

const TYPE_OPTIONS: Array<{ value: ReportType | ""; label: string }> = [
  { value: "", label: "All content" },
  { value: "PLAYER", label: "Users" },
  { value: "MESSAGE", label: "Messages" },
  { value: "CLUB_POST", label: "Posts" },
  { value: "COURT", label: "Courts" },
];

function typePath(type: ReportType) {
  return type.toLowerCase().replace("_", "-");
}

export default function ReportedContentQueuePage() {
  const [type, setType] = useState<ReportType | "">("");
  const [state, setState] = useState<QueueState | "">("PENDING");
  const [priority, setPriority] = useState<TrustSafetyPriority | "">("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ReportedContentResponse | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (state) params.set("state", state);
      if (priority) params.set("priority", priority);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<ReportedContentResponse>(`/trust-safety/reports?${params.toString()}`);
      setData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reported content could not be loaded.");
    }
  }, [priority, search, state, type]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => data?.counts ?? { pending: 0, actioned: 0, dismissed: 0, urgent: 0, high: 0 }, [data]);

  async function review(item: ReportedContentItem, action: "START_REVIEW" | "ACTION" | "DISMISS") {
    const reason = action === "START_REVIEW" ? "" : window.prompt(action === "ACTION" ? "Action reason" : "Dismissal reason");
    if (reason === null) return;
    if (action !== "START_REVIEW" && !reason.trim()) {
      setError("A decision reason is required.");
      return;
    }
    if (action !== "START_REVIEW" && !window.confirm(`Confirm ${action === "ACTION" ? "action" : "dismissal"} for this ${label(item.type).toLowerCase()} report.`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await api.patch(`/trust-safety/reports/${typePath(item.type)}/${item.id}`, { action, reason: reason || undefined });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The report action could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  async function setPriorityFor(item: ReportedContentItem, next: TrustSafetyPriority) {
    if (!window.confirm(`Set ${label(item.type).toLowerCase()} report priority to ${label(next).toLowerCase()}?`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await api.patch(`/trust-safety/reports/${typePath(item.type)}/${item.id}`, { action: "ESCALATE_PRIORITY", priority: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Priority could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function openCase(item: ReportedContentItem) {
    const summary = window.prompt(`Case summary for ${item.subject?.name ?? "this account"}`, `${label(item.type)} report: ${item.reason}`);
    if (!summary?.trim()) return;
    if (!window.confirm("Open or attach this evidence to an abuse case?")) return;
    setBusyId(item.id);
    setError(null);
    try {
      await api.post(`/trust-safety/reports/${typePath(item.type)}/${item.id}/case`, {
        summary,
        priority: item.priority === "NORMAL" ? "HIGH" : item.priority,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "An abuse case could not be opened.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reported Content Queue"
        description="Platform-wide review of flagged users, messages, posts, and courts."
        action={<Link href="/abuse-cases" className="rounded-md border border-drift-border bg-drift-surface px-4 py-2 text-sm font-semibold text-drift-text-primary hover:bg-drift-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Abuse cases</Link>}
      />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Pending</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.pending}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Actioned</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.actioned}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Dismissed</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.dismissed}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Urgent</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.urgent}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">High</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.high}</div></Card>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_170px_170px_160px]">
          <Input aria-label="Search reports" placeholder="Search reason, reporter, subject, content..." value={search} onChange={(event) => { setSearch(event.target.value); setData(null); }} />
          <Field label="Type"><Select value={type} onChange={(event) => { setType(event.target.value as ReportType | ""); setData(null); }}>{TYPE_OPTIONS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}</Select></Field>
          <Field label="State"><Select value={state} onChange={(event) => { setState(event.target.value as QueueState | ""); setData(null); }}><option value="">Any state</option><option value="PENDING">Pending</option><option value="ACTIONED">Actioned</option><option value="DISMISSED">Dismissed</option></Select></Field>
          <Field label="Priority"><Select value={priority} onChange={(event) => { setPriority(event.target.value as TrustSafetyPriority | ""); setData(null); }}><option value="">Any priority</option><option value="URGENT">Urgent</option><option value="HIGH">High</option><option value="NORMAL">Normal</option></Select></Field>
        </div>
      </Card>

      {data === null && !error && <EmptyState message="Loading reported content..." />}
      {data?.items.length === 0 && <EmptyState message={state === "PENDING" ? "Nothing pending review" : "No reports match these filters."} />}
      {data && data.items.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[1120px]">
            <thead><tr><Th>Report</Th><Th>Subject</Th><Th>Reporter</Th><Th>State</Th><Th>Priority</Th><Th>Received</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <Td><div className="font-semibold">{label(item.type)} - {label(item.reason)}</div><div className="max-w-md truncate text-xs text-drift-text-secondary" title={item.preview}>{item.preview}</div>{item.locationLabel && <div className="text-xs text-drift-text-secondary">{item.locationLabel}</div>}{item.notes && <div className="mt-1 max-w-md truncate text-xs text-drift-text-secondary" title={item.notes}>Reporter note: {item.notes}</div>}</Td>
                  <Td>{item.subject ? <div><div className="font-semibold">{item.subject.name}</div><div className="text-xs text-drift-text-secondary">{item.subject.email}</div></div> : <span className="text-sm text-drift-text-secondary">No account subject</span>}</Td>
                  <Td><div>{item.reporter.name}</div><div className="text-xs text-drift-text-secondary">{item.reporter.email}</div></Td>
                  <Td><Badge tone={statusTone(item.state)}>{label(item.state)}</Badge><div className="mt-1 text-xs text-drift-text-secondary">{label(item.sourceStatus)}</div></Td>
                  <Td><Badge tone={priorityTone(item.priority)}>{label(item.priority)}</Badge></Td>
                  <Td>{dateTime(item.createdAt)}</Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.state === "PENDING" && item.sourceStatus === "OPEN" && <Button variant="secondary" disabled={busyId === item.id} onClick={() => void review(item, "START_REVIEW")}>Start review</Button>}
                      {item.state === "PENDING" && <Button disabled={busyId === item.id} onClick={() => void review(item, "ACTION")}>Action</Button>}
                      {item.state === "PENDING" && <Button variant="ghost" disabled={busyId === item.id} onClick={() => void review(item, "DISMISS")}>Dismiss</Button>}
                      {item.priority !== "URGENT" && <Button variant="secondary" disabled={busyId === item.id} onClick={() => void setPriorityFor(item, item.priority === "NORMAL" ? "HIGH" : "URGENT")}>Escalate</Button>}
                      {item.canOpenCase && <Button variant="secondary" disabled={busyId === item.id} onClick={() => void openCase(item)}>Open case</Button>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
