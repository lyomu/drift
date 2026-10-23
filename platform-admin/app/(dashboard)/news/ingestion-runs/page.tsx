"use client";

import { useEffect, useState } from "react";
import { RowCard } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, EmptyState, ErrorBanner, PageHeader, statusTone } from "@/components/ui";

interface Run {
  id: string;
  sourceId: string;
  source: { name: string };
  status: string;
  startedAt: string;
  finishedAt: string | null;
  fetchedCount: number;
  createdCount: number;
  duplicateCount: number;
  skippedCount: number;
  aiFailureCount: number;
  autoPublishedCount: number;
  errorCode: string | null;
  httpStatus: number | null;
  finalUrl: string | null;
  redirectCount: number;
  latencyMs: number | null;
}

export default function NewsIngestionRunsPage() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api.get<{ runs: Run[]; total: number }>(`/news/ingestion-runs?skip=${skip}`).then((result) => { setRuns(result.runs); setTotal(result.total); setError(null); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load ingestion runs."));
  }, [skip, refresh]);

  return <div>
    <PageHeader title="News ingestion runs" description="Recent source polls and their import results." />
    <ErrorBanner message={error} />
    <div className="mb-4"><Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>Refresh runs</Button></div>
    {!runs && !error && <EmptyState message="Loading…" />}
    {runs?.length === 0 && <EmptyState message="No ingestion runs yet." />}
    <div className="flex flex-col gap-2">{runs?.map((run) => <RowCard key={run.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><Badge tone={statusTone(run.status)}>{run.status}</Badge> <span className="font-medium text-drift-text-primary">{run.source.name}</span>
          <div className="mt-1 text-xs text-drift-text-secondary">Fetched {run.fetchedCount} · Added {run.createdCount} · Duplicates {run.duplicateCount} · Skipped {run.skippedCount} · AI failures {run.aiFailureCount} · Auto published {run.autoPublishedCount}</div>
          {run.errorCode && <div className="mt-1 text-xs font-semibold text-drift-error">{run.errorCode}</div>}
          <div className="mt-1 text-xs text-drift-text-secondary">HTTP {run.httpStatus ?? "unknown"} · {run.latencyMs ?? "unknown"} ms · {run.redirectCount} redirects{run.finalUrl ? ` · ${run.finalUrl}` : ""}</div>
        </div>
        <div className="text-xs text-drift-text-secondary">{new Date(run.startedAt).toLocaleString()}</div>
      </div>
    </RowCard>)}</div>
    {total > 50 && <div className="mt-5 flex items-center justify-between gap-3 text-sm text-drift-text-secondary"><span>Showing {skip + 1}–{Math.min(skip + 50, total)} of {total}</span><div className="flex gap-2"><Button variant="secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 50))}>Previous</Button><Button variant="secondary" disabled={skip + 50 >= total} onClick={() => setSkip(skip + 50)}>Next</Button></div></div>}
  </div>;
}
