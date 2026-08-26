"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LearningContentForm } from "@/components/LearningContentForm";
import { api, ApiError } from "@/lib/api-client";
import type { LearningContentInput, LearningContentSummary } from "@/lib/content-types";
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, statusTone } from "@/components/ui";

function label(value: string | null) {
  return value ? value.replaceAll("_", " ") : "Any level";
}

function toInput(content: LearningContentSummary): LearningContentInput {
  return {
    sport: content.sport,
    targetSkill: content.targetSkill,
    branch: content.branch,
    title: content.title,
    summary: content.summary,
    bodyText: content.bodyText,
    videoUrl: content.videoUrl,
    durationMinutes: content.durationMinutes,
    status: content.status,
  };
}

export default function ContentDetailPage() {
  const params = useParams<{ id: string }>();
  const [content, setContent] = useState<LearningContentSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<{ content: LearningContentSummary }>(`/learning-content/${params.id}`);
      setContent(response.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Content could not be loaded.");
    }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  async function save(value: LearningContentInput) {
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await api.patch(`/learning-content/${params.id}`, value);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Content could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={content?.title ?? "Content item"}
        description="Learning catalogue item and publishing state."
        action={<Link href="/content" className="text-sm font-semibold text-drift-primary hover:underline">Back to library</Link>}
      />
      <ErrorBanner message={error} />
      {saved && <div className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm text-drift-success">Content saved.</div>}
      {!content && !error && <EmptyState message="Loading content item..." />}
      {content?.type === "TRAINING_PLAN" && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTone(content.status)}>{label(content.status)}</Badge>
                <Badge tone="info">Learning path</Badge>
              </div>
              <p className="mt-2 text-sm text-drift-text-secondary">Open the path builder to edit structure and ordering.</p>
            </div>
            <Link href="/content/paths" className="font-semibold text-drift-primary hover:underline">Open path builder</Link>
          </div>
        </Card>
      )}
      {content && content.type !== "TRAINING_PLAN" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card><LearningContentForm key={content.id} initial={toInput(content)} busy={busy} submitLabel="Save content" onSubmit={save} /></Card>
          <Card>
            <h2 className="mb-4 font-display text-xl font-semibold text-drift-text-primary">Usage</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Status</span><Badge tone={statusTone(content.status)}>{label(content.status)}</Badge></div>
              <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Type</span><span className="font-semibold">{label(content.type)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Skill</span><span>{label(content.targetSkill)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Level</span><span>{label(content.branch)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Completions</span><span>{content.counts.completions}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Practice logs</span><span>{content.counts.practiceSessions}</span></div>
            </div>
            <h3 className="mb-2 mt-6 font-semibold text-drift-text-primary">Used in paths</h3>
            {content.usedInPaths.length === 0 && <EmptyState message="This item is not used in a learning path." />}
            <div className="space-y-2">
              {content.usedInPaths.map((path) => (
                <div key={`${path.id}-${path.order}`} className="rounded-md border border-drift-border px-3 py-2 text-sm">
                  <div className="font-semibold text-drift-text-primary">{path.title}</div>
                  <div className="text-xs text-drift-text-secondary">Step {path.order} / {label(path.status)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
