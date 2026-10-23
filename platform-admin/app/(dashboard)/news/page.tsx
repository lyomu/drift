"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, EmptyState, ErrorBanner, PageHeader, statusTone } from "@/components/ui";

interface Run {
  id: string;
  status: string;
  startedAt: string;
  createdCount: number;
  errorCode: string | null;
  source: { name: string };
}
interface Overview {
  total: number;
  published: number;
  pending: number;
  rejected: number;
  sources: number;
  activeSources: number;
  failedSources: number;
  recentRuns: Run[];
}

export default function NewsOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get<Overview>("/news/overview").then(setData).catch((err) =>
      setError(err instanceof ApiError ? err.message : "Failed to load news overview."));
  }, []);

  return <div>
    <PageHeader title="News Management" description="Track tennis news ingestion, editorial review, and source permissions." />
    <ErrorBanner message={error} />
    {!data && !error && <EmptyState message="Loading…" />}
    {data && <>
      <StatBand stats={[
        { label: "Published", value: data.published, icon: "newspaper", tone: "green" },
        { label: "Pending review", value: data.pending, icon: "rate_review", tone: "amber" },
        { label: "Sources", value: data.sources, icon: "rss_feed", tone: "green" },
        { label: "Blocked sources", value: data.failedSources, icon: "error", tone: "red" },
      ]} />
      <div className="mb-5 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/news/stories" className="text-drift-primary hover:underline">Open review queue</Link>
        <Link href="/news/sources" className="text-drift-primary hover:underline">Manage sources</Link>
        <Link href="/news/ingestion-runs" className="text-drift-primary hover:underline">View ingestion runs</Link>
      </div>
      <h2 className="mb-3 font-display text-lg font-bold text-drift-text-primary">Recent ingestion runs</h2>
      {data.recentRuns.length === 0 && <EmptyState message="No feed syncs yet." />}
      <div className="flex flex-col gap-2">{data.recentRuns.map((run) => <RowCard key={run.id}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><span className="font-semibold text-drift-text-primary">{run.source.name}</span> <Badge tone={statusTone(run.status)}>{run.status}</Badge>
            <div className="mt-1 text-xs text-drift-text-secondary">{run.createdCount} new · {run.errorCode ?? "No error"}</div></div>
          <div className="text-xs text-drift-text-secondary">{new Date(run.startedAt).toLocaleString()}</div>
        </div>
      </RowCard>)}</div>
    </>}
  </div>;
}
