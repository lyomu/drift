"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { SystemSetting, SystemSettingType } from "@/lib/platform-config-types";
import { jsonText, label, parseSettingValue } from "@/lib/platform-config-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Textarea, Th, statusTone } from "@/components/ui";
import { StatBand } from "@/components/dashboard-design";

type SettingForm = {
  key: string;
  label: string;
  description: string;
  valueType: SystemSettingType;
  value: string;
};

const EMPTY_FORM: SettingForm = {
  key: "",
  label: "",
  description: "",
  valueType: "STRING",
  value: "",
};

function formFromSetting(setting: SystemSetting): SettingForm {
  return {
    key: setting.key,
    label: setting.label,
    description: setting.description ?? "",
    valueType: setting.valueType,
    value: setting.valueType === "JSON" ? jsonText(setting.value) : String(setting.value),
  };
}

function valueSummary(setting: SystemSetting) {
  if (setting.valueType === "JSON") return jsonText(setting.value);
  return String(setting.value);
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[] | null>(null);
  const [type, setType] = useState<SystemSettingType | "">("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SystemSetting | null>(null);
  const [form, setForm] = useState<SettingForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ settings: SystemSetting[] }>(`/platform-config/system-settings?${params.toString()}`);
      setSettings(response.settings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "System settings could not be loaded.");
    }
  }, [search, type]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    total: settings?.length ?? 0,
    json: settings?.filter((setting) => setting.valueType === "JSON").length ?? 0,
  }), [settings]);

  function startNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(setting: SystemSetting) {
    setEditing(setting);
    setForm(formFromSetting(setting));
    setError(null);
  }

  function changeType(valueType: SystemSettingType) {
    setForm((current) => ({
      ...current,
      valueType,
      value: valueType === "BOOLEAN" ? "true" : valueType === "JSON" ? "{}" : "",
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (editing && !window.confirm(`Save global setting ${editing.key}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const value = parseSettingValue(form.valueType, form.value);
      const payload = {
        key: form.key,
        label: form.label,
        description: form.description || null,
        valueType: form.valueType,
        value,
      };
      if (editing) await api.patch(`/platform-config/system-settings/${editing.id}`, payload);
      else await api.post("/platform-config/system-settings", payload);
      await load();
      if (!editing) startNew();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "The setting could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="System Settings" description="Edit typed global app configuration values." action={<Button variant="secondary" onClick={startNew}>New setting</Button>} />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Visible settings", value: counts.total, icon: "tune", tone: "blue" },
          { label: "JSON settings", value: counts.json, icon: "data_object", tone: "gray" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
              <Field label="Search"><Input value={search} onChange={(event) => { setSearch(event.target.value); setSettings(null); }} placeholder="Key, label, or description" /></Field>
              <Field label="Type"><Select value={type} onChange={(event) => { setType(event.target.value as SystemSettingType | ""); setSettings(null); }}><option value="">Any type</option><option value="STRING">String</option><option value="NUMBER">Number</option><option value="BOOLEAN">Boolean</option><option value="JSON">JSON</option></Select></Field>
              <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => void load()}>Refresh</Button></div>
            </div>
          </Card>

          {settings === null && !error && <EmptyState message="Loading system settings..." />}
          {settings?.length === 0 && <EmptyState message="No system settings match these filters." />}
          {settings && settings.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[920px]">
                <thead><tr><Th>Setting</Th><Th>Type</Th><Th>Value</Th><Th>Updated</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.id}>
                      <Td><div className="font-semibold">{setting.label}</div><div className="text-xs text-drift-text-secondary">{setting.key}</div></Td>
                      <Td><Badge tone={statusTone(setting.valueType)}>{label(setting.valueType)}</Badge></Td>
                      <Td><div className="max-w-md truncate text-sm" title={valueSummary(setting)}>{valueSummary(setting)}</div></Td>
                      <Td>{new Date(setting.updatedAt).toLocaleString()}</Td>
                      <Td className="text-right"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(setting)}>Edit</button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">{editing ? "Edit setting" : "Create setting"}</h2><p className="mt-1 text-sm text-drift-text-secondary">Values are stored as typed JSON so consumers can read them consistently.</p></div>
            {editing && <Button type="button" variant="ghost" onClick={startNew}>New</Button>}
          </div>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Key"><Input required value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} placeholder="MATCH_RESCHEDULE_LIMIT" /></Field>
            <Field label="Label"><Input required value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} /></Field>
            <Field label="Description"><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
            <Field label="Value type"><Select value={form.valueType} onChange={(event) => changeType(event.target.value as SystemSettingType)}><option value="STRING">String</option><option value="NUMBER">Number</option><option value="BOOLEAN">Boolean</option><option value="JSON">JSON</option></Select></Field>
            {form.valueType === "BOOLEAN" ? (
              <Field label="Value"><Select value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}><option value="true">True</option><option value="false">False</option></Select></Field>
            ) : form.valueType === "JSON" ? (
              <Field label="Value"><Textarea required rows={7} value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} /></Field>
            ) : (
              <Field label="Value"><Input required type={form.valueType === "NUMBER" ? "number" : "text"} value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} /></Field>
            )}
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Save setting" : "Create setting"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
