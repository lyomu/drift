"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon, ModalShell, RowCard } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea, statusTone } from "@/components/ui";

interface StoryRow {
  id: string;
  headline: string;
  highlight: string;
  originalFeedExcerpt: string | null;
  originalFeedHeadline: string | null;
  reviewFlags: string[];
  originalUrl: string;
  publicationDate: string;
  editorialVersion: number;
  categories: string[];
  aiSummary: string | null;
  aiProvider: string | null;
  aiConfidence: number | null;
  aiRelevanceScore: number | null;
  aiRiskFlags: string[];
  aiPlayers: string[];
  aiTournaments: string[];
  aiErrorCode: string | null;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
  source: { id: string; name: string; status: "ACTIVE" | "PAUSED" | "BLOCKED"; rights: { status: string; expiresAt: string | null } | null };
}
interface Category { slug: string; label: string; enabled: boolean }

export default function StoriesPage() {
  const [moderation, setModeration] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED" | "">("PENDING");
  const [rows, setRows] = useState<StoryRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StoryRow | null>(null);
  const [editHeadline, setEditHeadline] = useState("");
  const [editHighlight, setEditHighlight] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<{ story: StoryRow; status: "APPROVED" | "REJECTED" | "PENDING" | "ARCHIVED" } | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(null);
      const params = new URLSearchParams();
      if (moderation) params.set("moderation", moderation);
      if (appliedSearch) params.set("search", appliedSearch);
      if (sourceId) params.set("sourceId", sourceId);
      if (category) params.set("category", category);
      params.set("skip", String(skip));
      const [res, options, sourceResult] = await Promise.all([
        api.get<{ stories: StoryRow[]; total: number }>(`/news/stories?${params.toString()}`),
        api.get<Category[]>("/news/categories"),
        api.get<{ sources: { id: string; name: string }[] }>("/news/sources"),
      ]);
      setRows(res.stories);
      setTotal(res.total);
      setCategories(options.filter((option) => option.enabled));
      setSources(sourceResult.sources);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load stories.");
    }
  }, [moderation, appliedSearch, sourceId, category, skip]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;
    setBusyId(action.story.id);
    try {
      await api.patch(`/news/stories/${action.story.id}/moderation`, { moderationStatus: action.status, reason: reason.trim() });
      setAction(null); setReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  function beginEdit(story: StoryRow) {
    setError(null);
    setEditing(story);
    setEditHeadline(story.headline);
    setEditHighlight(story.highlight);
    setEditCategories(story.categories);
    setReason("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusyId(editing.id);
    try {
      await api.patch(`/news/stories/${editing.id}`, {
        headline: editHeadline.trim(), highlight: editHighlight.trim(),
        categories: editCategories, editorialVersion: editing.editorialVersion,
        reason: reason.trim(),
      });
      setEditing(null); setReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save story. Reload if another editor changed it.");
    } finally { setBusyId(null); }
  }

  return (
    <div>
      <PageHeader
        title="News Stories"
        description="Review short previews and the publisher's original article before publication."
      />
      <ErrorBanner message={error} />

      <Card className="mb-4 p-4 flex flex-wrap items-end gap-3">
        <Field label="Moderation">
          <Select value={moderation} onChange={(e) => { setModeration(e.target.value as typeof moderation); setSkip(0); }}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
            <option value="">All</option>
          </Select>
        </Field>
        <Field label="Source"><Select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setSkip(0); }}><option value="">All sources</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</Select></Field>
        <Field label="Category"><Select value={category} onChange={(e) => { setCategory(e.target.value); setSkip(0); }}><option value="">All categories</option>{categories.map((option) => <option key={option.slug} value={option.slug}>{option.label}</option>)}</Select></Field>
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setAppliedSearch(search.trim()); setSkip(0); }}>
          <Field label="Headline"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search headlines" maxLength={120} /></Field>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
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
                    <Badge tone={statusTone(story.source.rights?.status ?? "UNREVIEWED")}>{story.source.rights?.status ?? "UNREVIEWED RIGHTS"}</Badge>
                    <span className="text-xs font-semibold text-drift-text-secondary">{story.source.name} / {new Date(story.publicationDate).toLocaleDateString()}</span>
                  </div>
                  <div className="font-bold text-drift-text-primary">{story.headline}</div>
                  {story.originalFeedHeadline && story.originalFeedHeadline !== story.headline && <p className="mt-1 text-xs text-drift-text-secondary"><strong>Original feed headline:</strong> {story.originalFeedHeadline}</p>}
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-drift-text-secondary">{story.highlight}</p>
                  {story.originalFeedExcerpt && <p className="mt-2 max-w-3xl text-xs text-drift-text-secondary"><strong>Original feed excerpt:</strong> {story.originalFeedExcerpt}</p>}
                  {story.reviewFlags.length > 0 && <p className="mt-2 text-xs font-semibold text-drift-error">Review flags: {story.reviewFlags.join(", ")}</p>}
                  {story.aiSummary && <div className="mt-2 max-w-3xl rounded-lg border border-drift-border p-3 text-sm text-drift-text-secondary"><strong className="text-drift-text-primary">AI suggestion for review</strong><p className="mt-1">{story.aiSummary}</p><p className="mt-1 text-xs">Confidence {Math.round((story.aiConfidence ?? 0) * 100)}% · Relevance {Math.round((story.aiRelevanceScore ?? 0) * 100)}%{story.aiRiskFlags.length ? ` · Flags: ${story.aiRiskFlags.join(", ")}` : ""}</p>{(story.aiPlayers.length > 0 || story.aiTournaments.length > 0) && <p className="mt-1 text-xs">Players: {story.aiPlayers.join(", ") || "none"} · Tournaments: {story.aiTournaments.join(", ") || "none"}</p>}</div>}
                  {story.aiErrorCode && <p className="mt-2 text-xs text-drift-text-secondary">AI processing failed; manual review is available.</p>}
                  {story.moderationStatus !== "APPROVED" && (story.source.status !== "ACTIVE" || story.source.rights?.status !== "APPROVED") && <p className="mt-2 text-xs font-semibold text-drift-text-secondary">Publication requires an active source and approved rights. Review the source before publishing.</p>}
                  <div className="mt-2 text-xs text-drift-text-secondary">{story.categories.map((slug) => categories.find((category) => category.slug === slug)?.label ?? slug).join(" · ")}</div>
                  {story.originalUrl.startsWith("https://") && <a href={story.originalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-drift-primary hover:underline">
                    Original source <MaterialIcon name="open_in_new" className="text-[15px]" />
                  </a>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {story.moderationStatus === "PENDING" && <Button variant="secondary" onClick={() => beginEdit(story)}>Edit preview</Button>}
                  {(story.moderationStatus === "PENDING" || story.moderationStatus === "REJECTED") && <Button icon="check" disabled={busyId === story.id || story.source.status !== "ACTIVE" || story.source.rights?.status !== "APPROVED"} onClick={() => { setError(null); setAction({ story, status: "APPROVED" }); setReason(""); }}>Publish</Button>}
                  {story.moderationStatus === "APPROVED" && <Button variant="secondary" disabled={busyId === story.id} onClick={() => { setError(null); setAction({ story, status: "PENDING" }); setReason(""); }}>Unpublish</Button>}
                  {(story.moderationStatus === "PENDING" || story.moderationStatus === "APPROVED") && <Button icon="close" variant="destructive" disabled={busyId === story.id} onClick={() => { setError(null); setAction({ story, status: "REJECTED" }); setReason(""); }}>Reject</Button>}
                  {story.moderationStatus !== "ARCHIVED" && <Button variant="secondary" disabled={busyId === story.id} onClick={() => { setError(null); setAction({ story, status: "ARCHIVED" }); setReason(""); }}>Archive</Button>}
                  {story.moderationStatus === "ARCHIVED" && <Button variant="secondary" disabled={busyId === story.id} onClick={() => { setError(null); setAction({ story, status: "PENDING" }); setReason(""); }}>Restore to review</Button>}
                </div>
              </div>
            </RowCard>
          ))}
        </div>
      )}
      {total > 50 && <div className="mt-5 flex items-center justify-between gap-3 text-sm text-drift-text-secondary"><span>Showing {skip + 1}–{Math.min(skip + 50, total)} of {total}</span><div className="flex gap-2"><Button variant="secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 50))}>Previous</Button><Button variant="secondary" disabled={skip + 50 >= total} onClick={() => setSkip(skip + 50)}>Next</Button></div></div>}
      {action && <ModalShell title={`${action.status === "APPROVED" ? "Publish" : action.status === "REJECTED" ? "Reject" : action.status === "ARCHIVED" ? "Archive" : action.story.moderationStatus === "ARCHIVED" ? "Restore" : "Unpublish"} story`} description={action.story.headline} onClose={() => setAction(null)}>
        <ErrorBanner message={error} />
        <form onSubmit={moderate} className="grid gap-4"><Field label="Editorial reason"><Textarea required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></Field><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setAction(null)}>Cancel</Button><Button type="submit" disabled={busyId !== null || reason.trim().length < 3}>Confirm</Button></div></form>
      </ModalShell>}
      {editing && <ModalShell title="Edit preview" description="Changes to a pending story need a fresh approval. The publisher URL stays as received." onClose={() => setEditing(null)}>
        <ErrorBanner message={error} />
        <form onSubmit={saveEdit} className="grid gap-4">
          <Field label="Headline"><Input required minLength={5} maxLength={500} value={editHeadline} onChange={(e) => setEditHeadline(e.target.value)} /></Field>
          <Field label="Short preview"><Textarea required minLength={10} maxLength={300} rows={4} value={editHighlight} onChange={(e) => setEditHighlight(e.target.value)} /></Field>
          {editing.aiSummary && <div className="rounded-lg border border-drift-border p-3 text-sm"><p className="text-drift-text-secondary">AI suggestion: {editing.aiSummary}</p><Button type="button" variant="secondary" onClick={() => setEditHighlight(editing.aiSummary ?? "")}>Use suggestion as draft</Button><p className="mt-2 text-xs text-drift-text-secondary">Verify every claim against the publisher before saving or publishing.</p></div>}
          <fieldset><legend className="mb-2 text-xs font-bold uppercase text-drift-text-secondary">Categories</legend><div className="flex flex-wrap gap-3">{categories.map((category) => <label key={category.slug} className="flex items-center gap-2 text-sm text-drift-text-primary"><input type="checkbox" checked={editCategories.includes(category.slug)} onChange={(e) => setEditCategories(e.target.checked ? [...editCategories, category.slug] : editCategories.filter((slug) => slug !== category.slug))} />{category.label}</label>)}</div></fieldset>
          <Field label="Reason for edit"><Textarea required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busyId !== null || editCategories.length === 0 || reason.trim().length < 3}>Save preview</Button></div>
        </form>
      </ModalShell>}
    </div>
  );
}
