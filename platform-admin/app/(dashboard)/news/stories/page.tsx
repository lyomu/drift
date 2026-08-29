"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon, RowCard } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, PageHeader, Select, statusTone } from "@/components/ui";

interface StoryRow {
  id: string;
  headline: string;
  highlight: string;
  originalUrl: string;
  publicationDate: string;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  source: { id: string; name: string };
}

export default function StoriesPage() {
  const [moderation, setModeration] = useState<"PENDING" | "APPROVED" | "REJECTED" | "">("PENDING");
  const [rows, setRows] = useState<StoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(null);
      const params = new URLSearchParams();
      if (moderation) params.set("moderation", moderation);
      const res = await api.get<{ stories: StoryRow[] }>(`/news/stories?${params.toString()}`);
      setRows(res.stories);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load stories.");
    }
  }, [moderation]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id: string, next: "APPROVED" | "REJECTED") {
    setBusyId(id);
    try {
      await api.patch(`/news/stories/${id}/moderation`, { moderationStatus: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="News Stories"
        description="Highlights only. Rejection removes visibility without touching publisher content."
      />
      <ErrorBanner message={error} />

      <Card className="mb-4 max-w-xs p-4">
        <Field label="Moderation">
          <Select value={moderation} onChange={(e) => setModeration(e.target.value as "PENDING" | "APPROVED" | "REJECTED" | "")}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </Select>
        </Field>
      </Card>

      {rows === null && !error && <EmptyState message="Loading..." />}
      {rows?.length === 0 && <EmptyState message={`No ${moderation || ""} stories.`} />}

      {rows && rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((story) => (
            <RowCard key={story.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(story.moderationStatus)}>{story.moderationStatus}</Badge>
                    <span className="text-xs font-semibold text-drift-text-secondary">{story.source.name} / {new Date(story.publicationDate).toLocaleDateString()}</span>
                  </div>
                  <div className="font-bold text-drift-text-primary">{story.headline}</div>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-drift-text-secondary">{story.highlight}</p>
                  <a href={story.originalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-drift-primary hover:underline">
                    Original source <MaterialIcon name="open_in_new" className="text-[15px]" />
                  </a>
                </div>
                <div className="flex shrink-0 gap-2">
                  {story.moderationStatus !== "APPROVED" && <Button icon="check" disabled={busyId === story.id} onClick={() => moderate(story.id, "APPROVED")}>Approve</Button>}
                  {story.moderationStatus !== "REJECTED" && <Button icon="close" variant="destructive" disabled={busyId === story.id} onClick={() => moderate(story.id, "REJECTED")}>Reject</Button>}
                </div>
              </div>
            </RowCard>
          ))}
        </div>
      )}
    </div>
  );
}
