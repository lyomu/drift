"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";

interface AuditRow {
  id: string; action: string; entityType: string; entityId: string;
  metadata: Record<string, unknown> | null; createdAt: string;
  actor: { name: string; email: string };
}
interface AutomationRow { id: string; sourceId: string; storyId: string; action: string; reason: string; createdAt: string }

export default function NewsAuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [automation, setAutomation] = useState<AutomationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([
      api.get<{ events: AuditRow[]; total: number }>(`/news/audit?skip=${skip}`),
      api.get<{ events: AutomationRow[]; total: number }>("/news/automation-events"),
    ])
      .then(([result, auto]) => { setRows(result.events); setTotal(result.total); setAutomation(auto.events); setError(null); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load News audit history."));
  }, [skip, refresh]);

  return <div>
    <PageHeader title="News Audit" description="Source, rights, settings, editorial, and automatic publication events." />
    <ErrorBanner message={error} />
    <div className="mb-4"><Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>Refresh audit</Button></div>
    {rows === null && !error && <EmptyState message="Loading audit history..." />}
    {rows?.length === 0 && <EmptyState message="No News changes recorded yet." />}
    {automation.length > 0 && <div className="mb-6"><h2 className="mb-3 text-lg font-bold text-drift-text-primary">Automatic publications</h2><div className="grid gap-3">{automation.map((event) => <Card key={event.id} className="p-4"><div className="flex items-center justify-between gap-3"><Badge tone="info">{event.action}</Badge><time className="text-xs text-drift-text-secondary" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time></div><p className="mt-2 text-sm text-drift-text-primary">{event.reason}</p><p className="mt-1 break-all text-xs text-drift-text-secondary">Story {event.storyId} · Source {event.sourceId}</p></Card>)}</div></div>}
    <div className="grid gap-3">
      {rows?.map((row) => <Card key={row.id} className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Badge tone="info">{row.action}</Badge><span className="text-sm font-semibold text-drift-text-primary">{row.actor.name || row.actor.email}</span></div>
          <time className="text-xs text-drift-text-secondary" dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time>
        </div>
        <div className="mt-2 break-all text-xs text-drift-text-secondary">{row.entityType} · {row.entityId}</div>
        {typeof row.metadata?.reason === "string" && <p className="mt-2 text-sm text-drift-text-primary">Reason: {row.metadata.reason}</p>}
      </Card>)}
    </div>
    {total > 50 && <div className="mt-5 flex items-center justify-between gap-3 text-sm text-drift-text-secondary"><span>Showing {skip + 1}–{Math.min(skip + 50, total)} of {total}</span><div className="flex gap-2"><Button variant="secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 50))}>Previous</Button><Button variant="secondary" disabled={skip + 50 >= total} onClick={() => setSkip(skip + 50)}>Next</Button></div></div>}
  </div>;
}
