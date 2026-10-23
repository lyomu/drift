"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalShell, RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { CurrentPlatformAdmin } from "@/lib/access-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";

type RightsStatus = "UNREVIEWED" | "APPROVED" | "RESTRICTED" | "REVOKED";
type SourceStatus = "ACTIVE" | "PAUSED" | "BLOCKED";
interface Rights {
  status: RightsStatus;
  termsUrl: string | null;
  permissionReference: string | null;
  commercialUseAllowed: boolean;
  headlineAllowed: boolean;
  excerptAllowed: boolean;
  imageAllowed: boolean;
  aiProcessingAllowed: boolean;
  automaticPublishingAllowed: boolean;
  cacheAllowed: boolean;
  attributionText: string | null;
  expiresAt: string | null;
  notes: string | null;
  reviewedAt: string | null;
}
interface NewsSource {
  id: string;
  name: string;
  feedUrl: string | null;
  status: SourceStatus;
  pollIntervalMinutes: number;
  publicationMode: "MANUAL" | "AUTO";
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  nextPollAt: string | null;
  rights: Rights | null;
  _count?: { stories: number };
}
interface FeedTest {
  status: "OK" | "FAILED";
  latencyMs: number;
  httpStatus?: number | null;
  finalUrl?: string;
  redirectCount?: number;
  feedTitle?: string | null;
  itemCount?: number;
  errorCode?: string;
  sampleItems?: { title: string | null; hasLink: boolean; hasDate: boolean; hasExcerpt: boolean }[];
}

const blankRights: Rights = {
  status: "UNREVIEWED", termsUrl: "", permissionReference: "",
  commercialUseAllowed: false, headlineAllowed: false, excerptAllowed: false,
  imageAllowed: false, aiProcessingAllowed: false, automaticPublishingAllowed: false, cacheAllowed: false,
  attributionText: "", expiresAt: "", notes: "", reviewedAt: null,
};
const rightFields = [
  ["commercialUseAllowed", "Commercial use"],
  ["headlineAllowed", "Headlines"],
  ["excerptAllowed", "Short excerpts"],
  ["cacheAllowed", "Store excerpts"],
  ["imageAllowed", "Publisher images"],
  ["aiProcessingAllowed", "AI processing"],
  ["automaticPublishingAllowed", "Automatic publishing"],
] as const;

/** Host of a feed URL for confirmation copy; falls back to the raw text. */
function feedHost(url: string): string {
  try { return new URL(url.trim()).host; } catch { return url.trim(); }
}

export default function NewsSourcesPage() {
  const [sources, setSources] = useState<NewsSource[] | null>(null);
  const [canReviewRights, setCanReviewRights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [selected, setSelected] = useState<NewsSource | null>(null);
  const [editing, setEditing] = useState<NewsSource | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editInterval, setEditInterval] = useState(30);
  const [editMode, setEditMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [rights, setRights] = useState<Rights>(blankRights);
  const [testResult, setTestResult] = useState<FeedTest | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [result, admin] = await Promise.all([
        api.get<{ sources: NewsSource[] }>("/news/sources"),
        api.get<CurrentPlatformAdmin>("/auth/me"),
      ]);
      setSources(result.sources);
      setCanReviewRights(admin.role.permissions.includes("CONTENT_MANAGE") && admin.role.permissions.includes("PLATFORM_CONFIG_MANAGE"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load sources.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Adding a source activates it, so the form hands off to a confirmation step
  // rather than posting straight away.
  function reviewSource(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmCreate(true);
  }

  function closeCreate() {
    setShowCreate(false); setConfirmCreate(false);
  }

  async function createSource() {
    setBusyId("new");
    try {
      await api.post("/news/sources", {
        name: name.trim(), feedUrl: feedUrl.trim() || null, status: "ACTIVE",
      });
      setName(""); setFeedUrl(""); closeCreate();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed.");
      setConfirmCreate(false);
    } finally { setBusyId(null); }
  }

  async function setStatus(source: NewsSource, status: SourceStatus) {
    setBusyId(source.id);
    try {
      await api.patch(`/news/sources/${source.id}`, {
        name: source.name, feedUrl: source.feedUrl, status,
        pollIntervalMinutes: source.pollIntervalMinutes,
        publicationMode: source.publicationMode,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status update failed.");
    } finally { setBusyId(null); }
  }

  function openEdit(source: NewsSource) {
    setError(null);
    setEditing(source); setEditName(source.name); setEditUrl(source.feedUrl ?? "");
    setEditInterval(source.pollIntervalMinutes);
    setEditMode(source.publicationMode);
  }

  async function saveSource(e: React.FormEvent) {
    e.preventDefault(); if (!editing) return;
    setBusyId(editing.id);
    try {
      await api.patch(`/news/sources/${editing.id}`, {
        name: editName.trim(), feedUrl: editUrl.trim() || null,
        status: editing.status === "ACTIVE" && (editName.trim() !== editing.name || editUrl.trim() !== editing.feedUrl) ? "PAUSED" : editing.status,
        pollIntervalMinutes: editInterval,
        publicationMode: editMode,
      });
      setEditing(null); await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Source update failed."); }
    finally { setBusyId(null); }
  }

  async function test(source: NewsSource) {
    setBusyId(source.id);
    setTestResult(null);
    try {
      setTestResult(await api.post<FeedTest>(`/news/sources/${source.id}/test`));
      setSelected(source);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connection test failed.");
    } finally { setBusyId(null); }
  }

  async function sync(source: NewsSource) {
    setBusyId(source.id);
    try {
      await api.post(`/news/sources/${source.id}/sync`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sync request failed.");
    } finally { setBusyId(null); }
  }

  function openRights(source: NewsSource) {
    setError(null);
    setSelected(source);
    setRights({ ...blankRights, ...source.rights });
    setTestResult(null);
  }

  async function saveRights(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (rights.status === "REVOKED" && !window.confirm("Revoke rights and withdraw this source’s published stories?")) return;
    setBusyId(selected.id);
    try {
      await api.patch(`/news/sources/${selected.id}/rights`, {
        ...rights,
        termsUrl: rights.termsUrl || undefined,
        permissionReference: rights.permissionReference || undefined,
        attributionText: rights.attributionText || undefined,
        expiresAt: rights.expiresAt || undefined,
        notes: rights.notes || undefined,
      });
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rights update failed.");
    } finally { setBusyId(null); }
  }

  return (
    <div>
      <PageHeader title="News sources" description="Sources go live when added and poll on their own. Stories still pass through the review queue."
        action={canReviewRights ? <Button variant="secondary" icon="add" onClick={() => { setError(null); setShowCreate(true); }}>Add source</Button> : undefined} />
      <ErrorBanner message={error} />
      <StatBand stats={[
        { label: "Active", value: sources?.filter((s) => s.status === "ACTIVE").length ?? 0, icon: "rss_feed", tone: "green" },
        { label: "Paused", value: sources?.filter((s) => s.status === "PAUSED").length ?? 0, icon: "pause_circle", tone: "amber" },
        { label: "Blocked", value: sources?.filter((s) => s.status === "BLOCKED").length ?? 0, icon: "block", tone: "red" },
      ]} />
      {sources === null && !error && <EmptyState message="Loading…" />}
      {sources?.length === 0 && <EmptyState message="No sources registered yet." />}
      <div className="flex flex-col gap-3">
        {sources?.map((source) => (
          <RowCard key={source.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-drift-text-primary">{source.name}</span>
                  <Badge tone={statusTone(source.status)}>{source.status}</Badge>
                  <Badge tone={statusTone(source.rights?.status ?? "UNREVIEWED")}>{source.rights?.status ?? "UNREVIEWED RIGHTS"}</Badge>
                  <Badge tone={source.publicationMode === "AUTO" ? "warning" : "info"}>{source.publicationMode === "AUTO" ? "Auto" : "Manual review"}</Badge>
                </div>
                <div className="mt-1 break-all text-xs text-drift-text-secondary">{source.feedUrl ?? "No feed URL"}</div>
                <div className="mt-1 text-xs text-drift-text-secondary">
                  {source._count?.stories ?? 0} stories · {source.pollIntervalMinutes} min polling · Last success: {source.lastSuccessAt ? new Date(source.lastSuccessAt).toLocaleString() : "never"}
                  {source.lastErrorCode ? ` · ${source.lastErrorCode}` : ""}
                </div>
                {source.status !== "ACTIVE" && source.rights?.status !== "APPROVED" && <p className="mt-2 text-xs font-semibold text-drift-text-secondary">Record permitted uses in Rights to allow automatic publishing.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!source.feedUrl || busyId === source.id} onClick={() => void test(source)}>Test</Button>
                {canReviewRights && <Button variant="secondary" disabled={busyId === source.id} onClick={() => openEdit(source)}>Edit</Button>}
                <Button variant="secondary" disabled={busyId === source.id} onClick={() => openRights(source)}>Rights</Button>
                {canReviewRights && (source.status === "ACTIVE" ? (
                  <Button variant="secondary" disabled={busyId === source.id} onClick={() => void setStatus(source, "PAUSED")}>Pause</Button>
                ) : (
                  <Button variant="secondary" disabled={busyId === source.id || source.rights?.status !== "APPROVED"} onClick={() => void setStatus(source, "ACTIVE")}>Activate</Button>
                ))}
                {canReviewRights && <Button variant="secondary" disabled={busyId === source.id || source.status !== "ACTIVE"} onClick={() => void sync(source)}>Sync now</Button>}
              </div>
            </div>
          </RowCard>
        ))}
      </div>

      {showCreate && <ModalShell title="Add news source" description={confirmCreate ? "Confirm before this source starts fetching." : "The source goes live as soon as you add it."} onClose={closeCreate}>
        <ErrorBanner message={error} />
        {confirmCreate ? <div className="flex flex-col gap-4">
          <p className="text-sm">Add <strong>{name.trim()}</strong> and start polling <strong>{feedHost(feedUrl)}</strong> every 30 minutes, beginning immediately.</p>
          <p className="text-sm text-drift-text-secondary">Fetched stories wait in the News Review Queue until you approve them. To let this source publish on its own later, record the publisher&apos;s terms under Rights.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmCreate(false)}>Back</Button>
            <Button type="button" disabled={busyId === "new"} onClick={createSource}>Add and activate</Button>
          </div>
        </div> : <form onSubmit={reviewSource} className="flex flex-col gap-4">
          <Field label="Publisher name"><Input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="RSS or Atom URL"><Input type="url" required value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://publisher.example/feed" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeCreate}>Cancel</Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>}
      </ModalShell>}

      {editing && <ModalShell title={`Edit source · ${editing.name}`} description="Changing the publisher name or feed URL clears the recorded rights review, which turns automatic publishing back off." onClose={() => setEditing(null)}>
        <ErrorBanner message={error} />
        <form onSubmit={saveSource} className="grid gap-4">
          <Field label="Publisher name"><Input required maxLength={120} value={editName} onChange={(e) => setEditName(e.target.value)} /></Field>
          <Field label="RSS or Atom URL"><Input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} /></Field>
          <Field label="Polling interval (minutes)"><Input type="number" min={15} max={120} value={editInterval} onChange={(e) => setEditInterval(Number(e.target.value))} /></Field>
          <Field label="Publication mode"><Select value={editMode} onChange={(e) => setEditMode(e.target.value as "MANUAL" | "AUTO")}><option value="MANUAL">Manual review</option><option value="AUTO">Validated automatic publishing</option></Select></Field>
          {editMode === "AUTO" && <p className="text-sm text-drift-text-secondary">Auto mode requires approved commercial, AI processing, and automatic publishing permissions. Global automation must also be enabled in News Settings.</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busyId !== null}>Save source</Button></div>
        </form>
      </ModalShell>}

      {selected && <ModalShell title={testResult ? `Connection test · ${selected.name}` : `Source rights · ${selected.name}`}
        description={testResult ? "This test does not import or publish items." : "Approval requires documented permission for every selected use."}
        onClose={() => { setSelected(null); setTestResult(null); }}>
        <ErrorBanner message={error} />
        {testResult ? <Card>
          <Badge tone={testResult.status === "OK" ? "success" : "error"}>{testResult.status}</Badge>
          <div className="mt-3 text-sm text-drift-text-secondary">{testResult.feedTitle ?? testResult.errorCode ?? "Untitled feed"} · HTTP {testResult.httpStatus ?? "unknown"} · {testResult.latencyMs} ms · {testResult.itemCount ?? 0} items · {testResult.redirectCount ?? 0} redirects</div>
          {testResult.finalUrl && <div className="mt-1 break-all text-xs text-drift-text-secondary">Final feed URL: {testResult.finalUrl}</div>}
          {testResult.sampleItems?.map((item, i) => <div key={i} className="mt-3 border-t border-drift-border pt-3 text-sm">
            <div className="font-semibold text-drift-text-primary">{item.title || "Untitled"}</div>
            <div className="text-xs text-drift-text-secondary">Safe link: {item.hasLink ? "yes" : "no"} · Date: {item.hasDate ? "yes" : "no"} · Excerpt: {item.hasExcerpt ? "yes" : "no"}</div>
          </div>)}
        </Card> : <form onSubmit={saveRights} className="flex flex-col gap-4">
          {!canReviewRights && <p className="text-sm text-drift-text-secondary">Rights approval requires Content and Platform Config permissions.</p>}
          <Field label="Rights status"><Select disabled={!canReviewRights} value={rights.status} onChange={(e) => setRights({ ...rights, status: e.target.value as RightsStatus })}>
            <option value="UNREVIEWED">Unreviewed</option><option value="APPROVED">Approved</option><option value="RESTRICTED">Restricted</option><option value="REVOKED">Revoked</option>
          </Select></Field>
          <Field label="Permission reference"><Input disabled={!canReviewRights} value={rights.permissionReference ?? ""} onChange={(e) => setRights({ ...rights, permissionReference: e.target.value })} placeholder="Agreement or approval record" /></Field>
          <Field label="Terms URL"><Input disabled={!canReviewRights} type="url" value={rights.termsUrl ?? ""} onChange={(e) => setRights({ ...rights, termsUrl: e.target.value })} /></Field>
          <Field label="Attribution text"><Input disabled={!canReviewRights} value={rights.attributionText ?? ""} onChange={(e) => setRights({ ...rights, attributionText: e.target.value })} /></Field>
          <Field label="Rights expiry"><Input disabled={!canReviewRights} type="date" value={rights.expiresAt?.slice(0, 10) ?? ""} onChange={(e) => setRights({ ...rights, expiresAt: e.target.value ? `${e.target.value}T23:59:59.000Z` : "" })} /></Field>
          <div className="grid gap-2 sm:grid-cols-2">{rightFields.map(([field, label]) => <label key={field} className="flex items-center gap-2 text-sm text-drift-text-primary">
            <input type="checkbox" disabled={!canReviewRights} checked={rights[field]} onChange={(e) => setRights({ ...rights, [field]: e.target.checked })} />{label}
          </label>)}</div>
          <Field label="Review notes"><Input disabled={!canReviewRights} value={rights.notes ?? ""} onChange={(e) => setRights({ ...rights, notes: e.target.value })} /></Field>
          {rights.reviewedAt && <p className="text-xs text-drift-text-secondary">Last reviewed: {new Date(rights.reviewedAt).toLocaleString()}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            {canReviewRights && <Button type="submit" disabled={busyId === selected.id}>Save rights</Button>}
          </div>
        </form>}
      </ModalShell>}
    </div>
  );
}
