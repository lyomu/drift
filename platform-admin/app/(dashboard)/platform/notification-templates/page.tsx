"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { NotificationTemplate, NotificationTemplateChannel, NotificationTemplatePreview, NotificationTemplateStatus } from "@/lib/platform-config-types";
import { jsonText, label, parseJsonObject } from "@/lib/platform-config-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Textarea, Th, statusTone } from "@/components/ui";

type TemplateForm = {
  key: string;
  name: string;
  description: string;
  channel: NotificationTemplateChannel;
  subject: string;
  body: string;
  previewData: string;
  status: NotificationTemplateStatus;
};

const EMPTY_FORM: TemplateForm = {
  key: "",
  name: "",
  description: "",
  channel: "PUSH",
  subject: "",
  body: "",
  previewData: "{\n  \"playerName\": \"Amina\"\n}",
  status: "DRAFT",
};

function formFromTemplate(template: NotificationTemplate): TemplateForm {
  return {
    key: template.key,
    name: template.name,
    description: template.description ?? "",
    channel: template.channel,
    subject: template.subject ?? "",
    body: template.body,
    previewData: jsonText(template.previewData ?? {}),
    status: template.status,
  };
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[] | null>(null);
  const [status, setStatus] = useState<NotificationTemplateStatus | "">("");
  const [channel, setChannel] = useState<NotificationTemplateChannel | "">("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [preview, setPreview] = useState<NotificationTemplatePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (channel) params.set("channel", channel);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ templates: NotificationTemplate[] }>(`/platform-config/notification-templates?${params.toString()}`);
      setTemplates(response.templates);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Notification templates could not be loaded.");
    }
  }, [channel, search, status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    live: templates?.filter((template) => template.status === "LIVE").length ?? 0,
    draft: templates?.filter((template) => template.status === "DRAFT").length ?? 0,
  }), [templates]);

  function startNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreview(null);
    setError(null);
  }

  function startEdit(template: NotificationTemplate) {
    setEditing(template);
    setForm(formFromTemplate(template));
    setPreview(null);
    setError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const previewData = parseJsonObject(form.previewData, {});
      const payload = {
        key: form.key,
        name: form.name,
        description: form.description || null,
        channel: form.channel,
        subject: form.channel === "EMAIL" ? form.subject : null,
        body: form.body,
        previewData,
        status: form.status,
      };
      if (editing?.status === "DRAFT" && form.status === "LIVE" && !window.confirm(`Publish ${editing.key} as a live ${form.channel} template?`)) return;
      if (editing) await api.patch(`/platform-config/notification-templates/${editing.id}`, payload);
      else await api.post("/platform-config/notification-templates", payload);
      await load();
      if (!editing) startNew();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "The template could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function previewTemplate(template: NotificationTemplate) {
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<{ preview: NotificationTemplatePreview }>(`/platform-config/notification-templates/${template.id}/preview`);
      startEdit(template);
      setPreview(response.preview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The template preview could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Notification Templates" description="Manage push, email, and SMS copy with draft/live lifecycle." action={<Button variant="secondary" onClick={startNew}>New template</Button>} />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4"><div className="text-sm font-semibold text-drift-text-secondary">Live</div><div className="mt-1 font-display text-3xl font-bold tabular-nums text-drift-text-primary">{counts.live}</div></Card>
        <Card className="p-4"><div className="text-sm font-semibold text-drift-text-secondary">Draft</div><div className="mt-1 font-display text-3xl font-bold tabular-nums text-drift-text-primary">{counts.draft}</div></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
              <Field label="Search"><Input value={search} onChange={(event) => { setSearch(event.target.value); setTemplates(null); }} placeholder="Key, subject, or body" /></Field>
              <Field label="Channel"><Select value={channel} onChange={(event) => { setChannel(event.target.value as NotificationTemplateChannel | ""); setTemplates(null); }}><option value="">Any channel</option><option value="PUSH">Push</option><option value="EMAIL">Email</option><option value="SMS">SMS</option></Select></Field>
              <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value as NotificationTemplateStatus | ""); setTemplates(null); }}><option value="">Any status</option><option value="DRAFT">Draft</option><option value="LIVE">Live</option></Select></Field>
              <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => void load()}>Refresh</Button></div>
            </div>
          </Card>

          {templates === null && !error && <EmptyState message="Loading notification templates..." />}
          {templates?.length === 0 && <EmptyState message="No notification templates match these filters." />}
          {templates && templates.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px]">
                <thead><tr><Th>Template</Th><Th>Channel</Th><Th>Status</Th><Th>Updated</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <Td><div className="font-semibold">{template.name}</div><div className="text-xs text-drift-text-secondary">{template.key}</div></Td>
                      <Td>{label(template.channel)}{template.subject && <div className="max-w-xs truncate text-xs text-drift-text-secondary">{template.subject}</div>}</Td>
                      <Td><Badge tone={statusTone(template.status)}>{label(template.status)}</Badge></Td>
                      <Td>{new Date(template.updatedAt).toLocaleString()}</Td>
                      <Td className="text-right"><div className="flex justify-end gap-3"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(template)}>Edit</button><button disabled={busy} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void previewTemplate(template)}>Preview</button></div></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">{editing ? "Edit template" : "Create template"}</h2><p className="mt-1 text-sm text-drift-text-secondary">Use double-brace tokens such as {"{{playerName}}"} in the copy.</p></div>
              {editing && <Button type="button" variant="ghost" onClick={startNew}>New</Button>}
            </div>
            <form onSubmit={save} className="flex flex-col gap-4">
              <Field label="Key"><Input required value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} placeholder="MATCH_REMINDER" /></Field>
              <Field label="Name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Channel"><Select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value as NotificationTemplateChannel }))}><option value="PUSH">Push</option><option value="EMAIL">Email</option><option value="SMS">SMS</option></Select></Field>
                <Field label="Status"><Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as NotificationTemplateStatus }))}><option value="DRAFT">Draft</option><option value="LIVE">Live</option></Select></Field>
              </div>
              <Field label="Description"><Textarea rows={2} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
              {form.channel === "EMAIL" && <Field label="Subject"><Input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></Field>}
              <Field label="Body"><Textarea required rows={7} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></Field>
              <Field label="Preview data JSON"><Textarea rows={5} value={form.previewData} onChange={(event) => setForm((current) => ({ ...current, previewData: event.target.value }))} /></Field>
              <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Save template" : "Create template"}</Button>
            </form>
          </Card>

          {preview && (
            <Card>
              <h2 className="font-display text-xl font-semibold text-drift-text-primary">Preview</h2>
              {preview.subject && <div className="mt-4"><div className="text-[13px] font-semibold text-drift-text-secondary">Subject</div><div className="mt-1 text-sm text-drift-text-primary">{preview.subject}</div></div>}
              <div className="mt-4"><div className="text-[13px] font-semibold text-drift-text-secondary">Body</div><div className="mt-1 whitespace-pre-wrap rounded-md border border-drift-border bg-drift-background p-3 text-sm text-drift-text-primary">{preview.body}</div></div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
