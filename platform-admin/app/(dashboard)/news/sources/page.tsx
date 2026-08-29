"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalShell, RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, EmptyState, ErrorBanner, Field, Input, PageHeader, statusTone } from "@/components/ui";

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
  const [showCreate, setShowCreate] = useState(false);
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
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function cycleStatus(source: NewsSource) {
    const next = source.status === "ACTIVE" ? "PAUSED" : source.status === "PAUSED" ? "BLOCKED" : "ACTIVE";
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
        description="The approved-source list. Ingestion is a later phase - this manages the registry and its lifecycle states."
        action={<Button variant="secondary" icon="add" onClick={() => setShowCreate(true)}>Add source</Button>}
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Active", value: sources?.filter((source) => source.status === "ACTIVE").length ?? 0, icon: "rss_feed", tone: "green" },
          { label: "Paused", value: sources?.filter((source) => source.status === "PAUSED").length ?? 0, icon: "pause_circle", tone: "amber" },
          { label: "Blocked", value: sources?.filter((source) => source.status === "BLOCKED").length ?? 0, icon: "block", tone: "red" },
        ]}
      />

      {sources === null && !error && <EmptyState message="Loading..." />}
      {sources?.length === 0 && <EmptyState message="No sources registered yet." />}

      {sources && sources.length > 0 && (
        <div className="flex flex-col gap-3">
          {sources.map((source) => (
            <RowCard key={source.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-drift-text-primary">{source.name}</span>
                    <Badge tone={statusTone(source.status)}>{source.status}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-drift-text-secondary">
                    {source.feedUrl ?? "No feed URL yet"} / {source._count?.stories ?? 0} stories
                  </div>
                </div>
                <Button variant="secondary" disabled={busyId === source.id} onClick={() => cycleStatus(source)}>
                  {source.status === "ACTIVE" ? "Pause" : source.status === "PAUSED" ? "Block" : "Re-activate"}
                </Button>
              </div>
            </RowCard>
          ))}
        </div>
      )}

      {showCreate && (
        <ModalShell
          title="Add source"
          description="Register an approved publisher or feed for the platform news queue."
          onClose={() => setShowCreate(false)}
        >
          <form onSubmit={createSource} className="flex flex-col gap-4">
            <Field label="Name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Drift Tennis Digest" />
            </Field>
            <Field label="Feed URL (optional, for ingestion later)">
              <Input type="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://example.com/feed" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" icon="add" disabled={busyId === "new"}>Add source</Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
