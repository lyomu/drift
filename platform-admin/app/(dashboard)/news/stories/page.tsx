"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";

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
  const [moderation, setModeration] = useState<"PENDING" | "APPROVED" | "REJECTED" | "">(
    "PENDING",
  );
  const [rows, setRows] = useState<StoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(null);
      const params = new URLSearchParams();
      if (moderation) params.set("moderation", moderation);
      const res = await api.get<{ stories: StoryRow[] }>(
        `/news/stories?${params.toString()}`,
      );
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
      await api.patch(`/news/stories/${id}/moderation`, {
        moderationStatus: next,
      });
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
        title="Story moderation"
        description="Highlights only — full article bodies never enter the system, so a rejection removes visibility without touching publisher content."
      />
      <ErrorBanner message={error} />

      <Card className="mb-4">
        <Select
          value={moderation}
          onChange={(e) =>
            setModeration(e.target.value as "PENDING" | "APPROVED" | "REJECTED" | "")
          }
          className="max-w-[200px]"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </Select>
      </Card>

      {rows === null && !error && <EmptyState message="Loading…" />}
      {rows?.length === 0 && (
        <EmptyState message={`No ${moderation || ""} stories.`} />
      )}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((s) => (
            <Card key={s.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Badge tone={statusTone(s.moderationStatus)}>
                  {s.moderationStatus}
                </Badge>
                <span className="text-xs text-drift-text-secondary">
                  {s.source.name} ·{" "}
                  {new Date(s.publicationDate).toLocaleDateString()}
                </span>
              </div>
              <div className="font-semibold text-drift-text-primary">
                {s.headline}
              </div>
              <p className="mt-1 text-sm text-drift-text-secondary">{s.highlight}</p>
              <a
                href={s.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-drift-primary hover:underline"
              >
                Original source ↗
              </a>
              <div className="mt-3 flex gap-2">
                {s.moderationStatus !== "APPROVED" && (
                  <Button
                    disabled={busyId === s.id}
                    onClick={() => moderate(s.id, "APPROVED")}
                  >
                    Approve
                  </Button>
                )}
                {s.moderationStatus !== "REJECTED" && (
                  <Button
                    variant="destructive"
                    disabled={busyId === s.id}
                    onClick={() => moderate(s.id, "REJECTED")}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
