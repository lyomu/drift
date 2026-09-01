"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalShell, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { FeatureFlag, FeatureFlagStatus, SupportedMarket } from "@/lib/platform-config-types";
import { label } from "@/lib/platform-config-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Td, Textarea, Th, statusTone } from "@/components/ui";
import { SectionHeader } from "../section-header";

type FlagForm = {
  key: string;
  name: string;
  description: string;
  status: FeatureFlagStatus;
  rolloutPercentage: string;
  marketId: string;
  cohort: string;
};

const EMPTY_FORM: FlagForm = {
  key: "",
  name: "",
  description: "",
  status: "OFF",
  rolloutPercentage: "0",
  marketId: "",
  cohort: "",
};

function formFromFlag(flag: FeatureFlag): FlagForm {
  return {
    key: flag.key,
    name: flag.name,
    description: flag.description ?? "",
    status: flag.status,
    rolloutPercentage: String(flag.rolloutPercentage),
    marketId: flag.marketId ?? "",
    cohort: flag.cohort ?? "",
  };
}

function marketLabel(market: SupportedMarket | null) {
  return market ? `${market.cityName}, ${market.countryCode}` : "All markets";
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [markets, setMarkets] = useState<SupportedMarket[]>([]);
  const [status, setStatus] = useState<FeatureFlagStatus | "">("");
  const [marketId, setMarketId] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [form, setForm] = useState<FlagForm>(EMPTY_FORM);
  const [showEditor, setShowEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (marketId) params.set("marketId", marketId);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ flags: FeatureFlag[]; markets: SupportedMarket[] }>(`/platform-config/feature-flags?${params.toString()}`);
      setFlags(response.flags);
      setMarkets(response.markets);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Feature flags could not be loaded.");
    }
  }, [marketId, search, status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    on: flags?.filter((flag) => flag.status === "ON").length ?? 0,
    partial: flags?.filter((flag) => flag.status === "PARTIAL").length ?? 0,
    off: flags?.filter((flag) => flag.status === "OFF").length ?? 0,
  }), [flags]);

  function startNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowEditor(true);
  }

  function startEdit(flag: FeatureFlag) {
    setEditing(flag);
    setForm(formFromFlag(flag));
    setError(null);
    setShowEditor(true);
  }

  async function save(event: React.FormEvent, override?: Partial<FlagForm>) {
    event.preventDefault();
    const nextForm = { ...form, ...override };
    setBusy(true);
    setError(null);
    try {
      const payload = {
        key: nextForm.key,
        name: nextForm.name,
        description: nextForm.description || null,
        status: nextForm.status,
        rolloutPercentage: Number(nextForm.rolloutPercentage),
        marketId: nextForm.marketId || null,
        cohort: nextForm.cohort || null,
      };
      if (editing) await api.patch(`/platform-config/feature-flags/${editing.id}`, payload);
      else await api.post("/platform-config/feature-flags", payload);
      await load();
      if (!editing) setForm(EMPTY_FORM);
      setEditing(null);
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The feature flag could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(flag: FeatureFlag) {
    const nextStatus: FeatureFlagStatus = flag.status === "OFF" ? "ON" : "OFF";
    const confirmed = window.confirm(`${nextStatus === "ON" ? "Enable" : "Disable"} ${flag.key}?`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/platform-config/feature-flags/${flag.id}`, {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        status: nextStatus,
        rolloutPercentage: nextStatus === "ON" ? 100 : 0,
        marketId: flag.marketId,
        cohort: flag.cohort,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The feature flag could not be toggled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Feature Flags" description="Toggle features by market, cohort, and rollout percentage. A flag with no market applies everywhere." action={<Button variant="secondary" icon="add" onClick={startNew}>New flag</Button>} />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "On", value: counts.on, icon: "toggle_on", tone: "green" },
          { label: "Partial rollout", value: counts.partial, icon: "percent", tone: "amber" },
          { label: "Off", value: counts.off, icon: "toggle_off", tone: "gray" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
          <Field label="Search"><Input value={search} onChange={(event) => { setSearch(event.target.value); setFlags(null); }} placeholder="Key, name, or cohort" /></Field>
          <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value as FeatureFlagStatus | ""); setFlags(null); }}><option value="">Any status</option><option value="ON">On</option><option value="PARTIAL">Partial</option><option value="OFF">Off</option></Select></Field>
          <Field label="Market"><Select value={marketId} onChange={(event) => { setMarketId(event.target.value); setFlags(null); }}><option value="">Any market</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.cityName}, {market.countryCode}</option>)}</Select></Field>
          <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => void load()}>Refresh</Button></div>
        </div>
      </Card>

      {flags === null && !error && <EmptyState message="Loading feature flags..." />}
      {flags?.length === 0 && <EmptyState message="No feature flags match these filters." />}
      {flags && flags.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px]">
            <thead><tr><Th>Flag</Th><Th>Scope</Th><Th>Rollout</Th><Th>Status</Th><Th>Updated</Th><Th className="text-right">Action</Th></tr></thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.id}>
                  <Td><div className="font-semibold">{flag.name}</div><div className="text-xs text-drift-text-secondary">{flag.key}</div></Td>
                  <Td>{marketLabel(flag.market)}<div className="text-xs text-drift-text-secondary">{flag.cohort || "All cohorts"}</div></Td>
                  <Td>{flag.rolloutPercentage}%</Td>
                  <Td><Badge tone={statusTone(flag.status)}>{label(flag.status)}</Badge></Td>
                  <Td>{new Date(flag.updatedAt).toLocaleString()}</Td>
                  <Td className="text-right"><div className="flex justify-end gap-3"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(flag)}>Edit</button><button disabled={busy} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void toggle(flag)}>{flag.status === "OFF" ? "Turn on" : "Turn off"}</button></div></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showEditor && (
        <ModalShell
          title={editing ? "Edit flag" : "Create flag"}
          description="Partial rollouts require a value from 1 to 99."
          onClose={() => setShowEditor(false)}
        >
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Key"><Input required value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} placeholder="PLAYER_GLOBAL_SEARCH" /></Field>
            <Field label="Name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="Description"><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status"><Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as FeatureFlagStatus, rolloutPercentage: event.target.value === "ON" ? "100" : event.target.value === "OFF" ? "0" : current.rolloutPercentage }))}><option value="OFF">Off</option><option value="ON">On</option><option value="PARTIAL">Partial rollout</option></Select></Field>
              <Field label="Rollout %"><Input type="number" min={0} max={100} required value={form.rolloutPercentage} onChange={(event) => setForm((current) => ({ ...current, rolloutPercentage: event.target.value }))} /></Field>
            </div>
            <Field label="Market"><Select value={form.marketId} onChange={(event) => setForm((current) => ({ ...current, marketId: event.target.value }))}><option value="">All markets</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.cityName}, {market.countryCode}</option>)}</Select></Field>
            <Field label="Cohort"><Input value={form.cohort} onChange={(event) => setForm((current) => ({ ...current, cohort: event.target.value }))} placeholder="beta_testers" /></Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button type="submit" icon="save" disabled={busy}>{busy ? "Saving..." : editing ? "Save flag" : "Create flag"}</Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
