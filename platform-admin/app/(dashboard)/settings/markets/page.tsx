"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalShell, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { MarketStatus, SupportedMarket } from "@/lib/platform-config-types";
import { label } from "@/lib/platform-config-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Td, Textarea, Th, statusTone } from "@/components/ui";
import { SectionHeader } from "../section-header";

type MarketForm = {
  countryCode: string;
  countryName: string;
  cityName: string;
  timezone: string;
  status: MarketStatus;
  notes: string;
};

const EMPTY_FORM: MarketForm = {
  countryCode: "",
  countryName: "",
  cityName: "",
  timezone: "",
  status: "COMING_SOON",
  notes: "",
};

function formFromMarket(market: SupportedMarket): MarketForm {
  return {
    countryCode: market.countryCode,
    countryName: market.countryName,
    cityName: market.cityName,
    timezone: market.timezone ?? "",
    status: market.status,
    notes: market.notes ?? "",
  };
}

export default function PlatformMarketsPage() {
  const [markets, setMarkets] = useState<SupportedMarket[] | null>(null);
  const [status, setStatus] = useState<MarketStatus | "">("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SupportedMarket | null>(null);
  const [form, setForm] = useState<MarketForm>(EMPTY_FORM);
  const [showEditor, setShowEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ markets: SupportedMarket[] }>(`/platform-config/markets?${params.toString()}`);
      setMarkets(response.markets);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Markets could not be loaded.");
    }
  }, [search, status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    active: markets?.filter((market) => market.status === "ACTIVE").length ?? 0,
    comingSoon: markets?.filter((market) => market.status === "COMING_SOON").length ?? 0,
    inactive: markets?.filter((market) => market.status === "INACTIVE").length ?? 0,
  }), [markets]);

  function startNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowEditor(true);
  }

  function startEdit(market: SupportedMarket) {
    setEditing(market);
    setForm(formFromMarket(market));
    setError(null);
    setShowEditor(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (editing && editing.status !== "INACTIVE" && form.status === "INACTIVE") {
      const confirmed = window.confirm(`Deactivate ${editing.cityName}? This removes it from active market configuration but preserves the record.`);
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...form,
        timezone: form.timezone || null,
        notes: form.notes || null,
      };
      if (editing) await api.patch(`/platform-config/markets/${editing.id}`, payload);
      else await api.post("/platform-config/markets", payload);
      await load();
      setEditing(null);
      setForm(EMPTY_FORM);
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The market could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(market: SupportedMarket, nextStatus: MarketStatus) {
    const reason = nextStatus === "INACTIVE" ? window.prompt(`Reason for deactivating ${market.cityName}`) : null;
    if (nextStatus === "INACTIVE" && !reason?.trim()) return;
    if (nextStatus === "INACTIVE" && !window.confirm(`Confirm ${market.cityName} should become inactive.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/platform-config/markets/${market.id}/status`, { status: nextStatus, reason });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The market status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Countries & Cities" description="Supported Drift markets and city-level availability. Markets drive rollout, feature-flag scope, and where players can find clubs." action={<Button variant="secondary" icon="add_location_alt" onClick={startNew}>Add market</Button>} />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Active", value: counts.active, icon: "check_circle", tone: "green" },
          { label: "Coming soon", value: counts.comingSoon, icon: "schedule", tone: "amber" },
          { label: "Inactive", value: counts.inactive, icon: "block", tone: "gray" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <Field label="Search"><Input value={search} onChange={(event) => { setSearch(event.target.value); setMarkets(null); }} placeholder="Country, city, or code" /></Field>
          <Field label="State"><Select value={status} onChange={(event) => { setStatus(event.target.value as MarketStatus | ""); setMarkets(null); }}><option value="">Any state</option><option value="ACTIVE">Active</option><option value="COMING_SOON">Coming soon</option><option value="INACTIVE">Inactive</option></Select></Field>
          <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => void load()}>Refresh</Button></div>
        </div>
      </Card>

      {markets === null && !error && <EmptyState message="Loading markets..." />}
      {markets?.length === 0 && <EmptyState message={status || search.trim() ? "No markets match these filters." : "Add your first market"} />}
      {markets && markets.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px]">
            <thead><tr><Th>Market</Th><Th>Timezone</Th><Th>Feature flags</Th><Th>Status</Th><Th>Updated</Th><Th className="text-right">Action</Th></tr></thead>
            <tbody>
              {markets.map((market) => (
                <tr key={market.id}>
                  <Td><div className="font-semibold">{market.cityName}</div><div className="text-xs text-drift-text-secondary">{market.countryName} ({market.countryCode})</div></Td>
                  <Td>{market.timezone ?? <span className="text-drift-text-secondary">Not set</span>}</Td>
                  <Td>{market._count?.featureFlags ?? 0}</Td>
                  <Td><Badge tone={statusTone(market.status)}>{label(market.status)}</Badge></Td>
                  <Td>{new Date(market.updatedAt).toLocaleString()}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-3">
                      <button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(market)}>Edit</button>
                      {market.status !== "ACTIVE" && <button disabled={busy} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void changeStatus(market, "ACTIVE")}>Activate</button>}
                      {market.status !== "INACTIVE" && <button disabled={busy} className="font-semibold text-drift-error hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void changeStatus(market, "INACTIVE")}>Deactivate</button>}
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
          title={editing ? "Edit market" : "Add market"}
          description="Markets drive rollout, availability, and city-level configuration."
          onClose={() => setShowEditor(false)}
        >
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Country code"><Input required minLength={2} maxLength={2} value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))} /></Field>
              <Field label="Status"><Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MarketStatus }))}><option value="ACTIVE">Active</option><option value="COMING_SOON">Coming soon</option><option value="INACTIVE">Inactive</option></Select></Field>
            </div>
            <Field label="Country"><Input required value={form.countryName} onChange={(event) => setForm((current) => ({ ...current, countryName: event.target.value }))} /></Field>
            <Field label="City"><Input required value={form.cityName} onChange={(event) => setForm((current) => ({ ...current, cityName: event.target.value }))} /></Field>
            <Field label="Timezone"><Input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Africa/Nairobi" /></Field>
            <Field label="Notes"><Textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button type="submit" icon="save" disabled={busy}>{busy ? "Saving..." : editing ? "Save market" : "Add market"}</Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
