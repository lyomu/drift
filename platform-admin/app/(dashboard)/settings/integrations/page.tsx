"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { IntegrationConfig, IntegrationStatus } from "@/lib/platform-config-types";
import { dateLabel, jsonText, label, parseJsonObject } from "@/lib/platform-config-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Td, Textarea, Th, statusTone } from "@/components/ui";
import { ModalShell, StatBand } from "@/components/dashboard-design";
import { SectionHeader } from "../section-header";

type IntegrationForm = {
  providerKey: string;
  name: string;
  description: string;
  config: string;
  secretRef: string;
  status: IntegrationStatus;
  lastError: string;
};

const EMPTY_FORM: IntegrationForm = {
  providerKey: "",
  name: "",
  description: "",
  config: "{}",
  secretRef: "",
  status: "DISCONNECTED",
  lastError: "",
};

function formFromIntegration(integration: IntegrationConfig): IntegrationForm {
  return {
    providerKey: integration.providerKey,
    name: integration.name,
    description: integration.description ?? "",
    config: jsonText(integration.config ?? {}),
    secretRef: integration.secretRef ?? "",
    status: integration.status,
    lastError: integration.lastError ?? "",
  };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[] | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | "">("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<IntegrationConfig | null>(null);
  const [form, setForm] = useState<IntegrationForm>(EMPTY_FORM);
  const [showEditor, setShowEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ integrations: IntegrationConfig[] }>(`/platform-config/integrations?${params.toString()}`);
      setIntegrations(response.integrations);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Integrations could not be loaded.");
    }
  }, [search, status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    connected: integrations?.filter((integration) => integration.status === "CONNECTED").length ?? 0,
    disconnected: integrations?.filter((integration) => integration.status === "DISCONNECTED").length ?? 0,
    error: integrations?.filter((integration) => integration.status === "ERROR").length ?? 0,
  }), [integrations]);

  function startNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowEditor(true);
  }

  function startEdit(integration: IntegrationConfig) {
    setEditing(integration);
    setForm(formFromIntegration(integration));
    setError(null);
    setShowEditor(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (editing && form.status === "DISCONNECTED" && editing.status !== "DISCONNECTED") {
      const confirmed = window.confirm(`Mark ${editing.providerKey} disconnected? Provider history remains visible.`);
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      const config = parseJsonObject(form.config, {});
      const payload = {
        providerKey: form.providerKey,
        name: form.name,
        description: form.description || null,
        config,
        secretRef: form.secretRef || null,
        status: form.status,
        lastError: form.status === "ERROR" ? form.lastError : null,
      };
      if (editing) await api.patch(`/platform-config/integrations/${editing.id}`, payload);
      else await api.post("/platform-config/integrations", payload);
      await load();
      setEditing(null);
      setForm(EMPTY_FORM);
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "The integration could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function recordCheck(integration: IntegrationConfig, nextStatus: IntegrationStatus) {
    const errorDetail = nextStatus === "ERROR" ? window.prompt(`Provider failure detail for ${integration.providerKey}`) : null;
    if (nextStatus === "ERROR" && !errorDetail?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/platform-config/integrations/${integration.id}/check`, { status: nextStatus, error: errorDetail });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The integration check result could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function rotateToken(integration: IntegrationConfig) {
    const secretRef = window.prompt(`New secret reference for ${integration.providerKey}`);
    if (!secretRef?.trim()) return;
    const reason = window.prompt("Reason for rotating this credential reference");
    const confirmed = window.confirm(`Rotate ${integration.providerKey} credential reference? The integration will be marked disconnected until a check is recorded.`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/platform-config/integrations/${integration.id}/rotate-token`, { secretRef, reason });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The credential reference could not be rotated.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(integration: IntegrationConfig) {
    const reason = window.prompt(`Reason for disabling ${integration.providerKey}`);
    if (!reason?.trim()) return;
    if (!window.confirm(`Disable ${integration.providerKey}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/platform-config/integrations/${integration.id}/disable`, { reason });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The integration could not be disabled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader title="API & Integrations" description="Provider configuration, credential references, and recorded connection health." action={<Button variant="secondary" icon="add" onClick={startNew}>New integration</Button>} />
      <ErrorBanner message={error} />
      <div className="mb-5 rounded-md border border-drift-warning/30 bg-drift-warning-surface px-4 py-3 text-sm leading-6 text-drift-warning">
        Connection checks here record the latest known provider state. This screen does not call Maps, Places, news, payment, push, email, or SMS providers.
      </div>

      <StatBand
        stats={[
          { label: "Connected", value: counts.connected, icon: "hub", tone: "green" },
          { label: "Disconnected", value: counts.disconnected, icon: "sync", tone: "gray" },
          { label: "Error", value: counts.error, icon: "priority_high", tone: "red" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <Field label="Search"><Input value={search} onChange={(event) => { setSearch(event.target.value); setIntegrations(null); }} placeholder="Provider or error detail" /></Field>
          <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value as IntegrationStatus | ""); setIntegrations(null); }}><option value="">Any status</option><option value="CONNECTED">Connected</option><option value="DISCONNECTED">Disconnected</option><option value="ERROR">Error</option></Select></Field>
          <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => void load()}>Refresh</Button></div>
        </div>
      </Card>

      {integrations === null && !error && <EmptyState message="Loading integrations..." />}
      {integrations?.length === 0 && <EmptyState message={status || search.trim() ? "No integrations match these filters." : "No integrations configured"} />}
      {integrations && integrations.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[1080px]">
            <thead><tr><Th>Provider</Th><Th>Status</Th><Th>Credentials</Th><Th>Last check</Th><Th>Error detail</Th><Th className="text-right">Action</Th></tr></thead>
            <tbody>
              {integrations.map((integration) => (
                <tr key={integration.id}>
                  <Td><div className="font-semibold">{integration.name}</div><div className="text-xs text-drift-text-secondary">{integration.providerKey}</div></Td>
                  <Td><Badge tone={statusTone(integration.status)}>{label(integration.status)}</Badge></Td>
                  <Td>{integration.hasSecretRef ? "Reference stored" : <span className="text-drift-text-secondary">No secret reference</span>}</Td>
                  <Td>{dateLabel(integration.lastCheckedAt)}</Td>
                  <Td><div className={`max-w-xs truncate ${integration.lastError ? "text-drift-error" : "text-drift-text-secondary"}`} title={integration.lastError ?? undefined}>{integration.lastError ?? "None"}</div></Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-3">
                      <button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(integration)}>Edit</button>
                      <button disabled={busy} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void recordCheck(integration, "CONNECTED")}>Record connected</button>
                      <button disabled={busy} className="font-semibold text-drift-error hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void recordCheck(integration, "ERROR")}>Record error</button>
                      <button disabled={busy} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void rotateToken(integration)}>Rotate token</button>
                      <button disabled={busy} className="font-semibold text-drift-error hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void disable(integration)}>Disable</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showEditor && (
        <ModalShell
          title={editing ? "Edit integration" : "Create integration"}
          description="Store provider config and references only. Raw credentials belong in the external secret manager."
          onClose={() => setShowEditor(false)}
        >
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Provider key"><Input required value={form.providerKey} onChange={(event) => setForm((current) => ({ ...current, providerKey: event.target.value }))} placeholder="GOOGLE_PLACES" /></Field>
            <Field label="Name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="Description"><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
            <Field label="Config JSON"><Textarea rows={6} value={form.config} onChange={(event) => setForm((current) => ({ ...current, config: event.target.value }))} /></Field>
            <Field label="Secret reference"><Input value={form.secretRef} onChange={(event) => setForm((current) => ({ ...current, secretRef: event.target.value }))} placeholder="vault://drift/google-places" /></Field>
            <Field label="Status"><Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as IntegrationStatus }))}><option value="DISCONNECTED">Disconnected</option><option value="CONNECTED">Connected</option><option value="ERROR">Error</option></Select></Field>
            {form.status === "ERROR" && <Field label="Provider failure detail"><Textarea required rows={3} value={form.lastError} onChange={(event) => setForm((current) => ({ ...current, lastError: event.target.value }))} /></Field>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button type="submit" icon="save" disabled={busy}>{busy ? "Saving..." : editing ? "Save integration" : "Create integration"}</Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
