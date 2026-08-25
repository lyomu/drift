"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  statusTone,
} from "@/components/ui";

interface NewsSource {
  id: string;
  name: string;
  feedUrl: string | null;
  status: "ACTIVE" | "PAUSED" | "BLOCKED";
  _count?: { stories: number };
}

export default function NewsSourcesPage() {
  const [sources, setSources] = useState<NewsSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ sources: NewsSource[] }>("/news/sources");
      setSources(res.sources);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load sources.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSource(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusyId("new");
    try {
      await api.post("/news/sources", {
        name: name.trim(),
        feedUrl: feedUrl.trim() || null,
        status: "ACTIVE",
      });
      setName("");
      setFeedUrl("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function cycleStatus(source: NewsSource) {
    const next =
      source.status === "ACTIVE"
        ? "PAUSED"
        : source.status === "PAUSED"
          ? "BLOCKED"
          : "ACTIVE";
    setBusyId(source.id);
    try {
      await api.patch(`/news/sources/${source.id}`, {
        name: source.name,
        feedUrl: source.feedUrl,
        status: next,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="News sources"
        description="The approved-source list. Ingestion is a later phase — this manages the registry and its lifecycle states."
      />
      <ErrorBanner message={error} />

      <Card className="mb-4">
        <form onSubmit={createSource} className="flex flex-wrap items-end gap-3">
          <Field label="Name">
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drift Tennis Digest"
              className="min-w-[220px]"
            />
          </Field>
          <Field label="Feed URL (optional, for ingestion later)">
            <Input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://…"
              className="min-w-[280px]"
            />
          </Field>
          <Button type="submit" disabled={busyId === "new"}>
            Add source
          </Button>
        </form>
      </Card>

      {sources === null && !error && <EmptyState message="Loading…" />}
      {sources?.length === 0 && <EmptyState message="No sources registered yet." />}

      {sources && sources.length > 0 && (
        <div className="flex flex-col gap-3">
          {sources.map((s) => (
            <Card
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-drift-text-primary">
                    {s.name}
                  </span>
                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-drift-text-secondary">
                  {s.feedUrl ?? "No feed URL yet"} · {s._count?.stories ?? 0}{" "}
                  stories
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={busyId === s.id}
                onClick={() => cycleStatus(s)}
              >
                {s.status === "ACTIVE"
                  ? "Pause"
                  : s.status === "PAUSED"
                    ? "Block"
                    : "Re-activate"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
