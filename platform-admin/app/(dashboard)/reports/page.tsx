"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionLink, MaterialIcon, RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { QueueState, ReportType, ReportedContentItem, ReportedContentResponse, TrustSafetyPriority } from "@/lib/trust-safety-types";
import { dateTime, label, priorityTone } from "@/lib/trust-safety-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";

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

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => data?.counts ?? { pending: 0, actioned: 0, dismissed: 0, urgent: 0, high: 0 },
    [data],
  );

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
        action={<ActionLink href="/abuse-cases" icon="block">Abuse cases</ActionLink>}
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Pending", value: counts.pending, icon: "pending_actions", tone: counts.pending ? "amber" : "gray" },
          { label: "Actioned", value: counts.actioned, icon: "task_alt", tone: "green" },
          { label: "Dismissed", value: counts.dismissed, icon: "visibility_off", tone: "gray" },
          { label: "Urgent / high", value: `${counts.urgent}/${counts.high}`, note: "urgent / high priority", icon: "priority_high", tone: counts.urgent ? "red" : "amber" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_170px_170px_160px]">
          <Input aria-label="Search reports" placeholder="Search reason, reporter, subject, content..." value={search} onChange={(event) => { setSearch(event.target.value); setData(null); }} />
          <Field label="Type">
            <Select value={type} onChange={(event) => { setType(event.target.value as ReportType | ""); setData(null); }}>
              {TYPE_OPTIONS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="State">
            <Select value={state} onChange={(event) => { setState(event.target.value as QueueState | ""); setData(null); }}>
              <option value="">Any state</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIONED">Actioned</option>
              <option value="DISMISSED">Dismissed</option>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(event) => { setPriority(event.target.value as TrustSafetyPriority | ""); setData(null); }}>
              <option value="">Any priority</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
            </Select>
          </Field>
        </div>
      </Card>

      {data === null && !error && <EmptyState message="Loading reported content..." />}
      {data?.items.length === 0 && <EmptyState message={state === "PENDING" ? "Nothing pending review" : "No reports match these filters."} />}

      {data && data.items.length > 0 && (
        <div className="grid gap-3">
          {data.items.map((item) => (
            <RowCard key={`${item.type}-${item.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(item.state)}>{label(item.state)}</Badge>
                    <Badge tone={priorityTone(item.priority)}>{label(item.priority)}</Badge>
                    <span className="text-xs font-semibold text-drift-text-secondary">{label(item.type)} / {dateTime(item.createdAt)}</span>
                  </div>
                  <div className="font-bold text-drift-text-primary">{label(item.reason)}</div>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-drift-text-secondary">{item.preview}</p>
                  <div className="mt-3 grid gap-2 text-xs text-drift-text-secondary md:grid-cols-3">
                    <span><strong className="text-drift-text-primary">Subject:</strong> {item.subject?.name ?? "No account subject"}</span>
                    <span><strong className="text-drift-text-primary">Reporter:</strong> {item.reporter.name}</span>
                    <span><strong className="text-drift-text-primary">Source:</strong> {label(item.sourceStatus)}</span>
                  </div>
                  {(item.locationLabel || item.notes) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-drift-text-secondary">
                      {item.locationLabel && <span className="inline-flex items-center gap-1"><MaterialIcon name="location_on" className="text-[15px]" />{item.locationLabel}</span>}
                      {item.notes && <span className="max-w-xl truncate">Reporter note: {item.notes}</span>}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {item.state === "PENDING" && item.sourceStatus === "OPEN" && <Button variant="secondary" icon="rate_review" disabled={busyId === item.id} onClick={() => void review(item, "START_REVIEW")}>Start</Button>}
                  {item.state === "PENDING" && <Button icon="gavel" disabled={busyId === item.id} onClick={() => void review(item, "ACTION")}>Action</Button>}
                  {item.state === "PENDING" && <Button variant="ghost" icon="close" disabled={busyId === item.id} onClick={() => void review(item, "DISMISS")}>Dismiss</Button>}
                  {item.priority !== "URGENT" && <Button variant="secondary" icon="priority_high" disabled={busyId === item.id} onClick={() => void setPriorityFor(item, item.priority === "NORMAL" ? "HIGH" : "URGENT")}>Escalate</Button>}
                  {item.canOpenCase && <Button variant="secondary" icon="folder_special" disabled={busyId === item.id} onClick={() => void openCase(item)}>Case</Button>}
                </div>
              </div>
            </RowCard>
          ))}
        </div>
      )}
    </div>
  );
}
