"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { SponsorPlacement, SponsorPlacementsResponse, SponsorPlacementState } from "@/lib/commercial-types";
import { dateLabel, label } from "@/lib/commercial-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

type SponsorForm = {
  name: string;
  sponsorName: string;
  placementKey: string;
  destinationUrl: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY_FORM: SponsorForm = {
  name: "",
  sponsorName: "",
  placementKey: "",
  destinationUrl: "",
  imageUrl: "",
  startsAt: toLocalInput(new Date().toISOString()),
  endsAt: "",
  isActive: true,
};

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formFromPlacement(placement: SponsorPlacement): SponsorForm {
  return {
    name: placement.name,
    sponsorName: placement.sponsorName,
    placementKey: placement.placementKey,
    destinationUrl: placement.destinationUrl ?? "",
    imageUrl: placement.imageUrl ?? "",
    startsAt: toLocalInput(placement.startsAt),
    endsAt: toLocalInput(placement.endsAt),
    isActive: placement.isActive,
  };
}

export default function CommercialSponsorsPage() {
  const [state, setState] = useState<SponsorPlacementState | "">("");
  const [placementKey, setPlacementKey] = useState("");
  const [placements, setPlacements] = useState<SponsorPlacement[] | null>(null);
  const [editing, setEditing] = useState<SponsorPlacement | null>(null);
  const [form, setForm] = useState<SponsorForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (state) params.set("state", state);
      if (placementKey.trim()) params.set("placementKey", placementKey.trim());
      const response = await api.get<SponsorPlacementsResponse>(`/commercial/sponsors?${params.toString()}`);
      setPlacements(response.placements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sponsorships could not be loaded.");
    }
  }, [placementKey, state]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    active: placements?.filter((placement) => placement.state === "ACTIVE").length ?? 0,
    scheduled: placements?.filter((placement) => placement.state === "SCHEDULED").length ?? 0,
    ended: placements?.filter((placement) => placement.state === "ENDED").length ?? 0,
  }), [placements]);

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, startsAt: toLocalInput(new Date().toISOString()) });
  }

  function startEdit(placement: SponsorPlacement) {
    setEditing(placement);
    setForm(formFromPlacement(placement));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      sponsorName: form.sponsorName,
      placementKey: form.placementKey,
      destinationUrl: form.destinationUrl || null,
      imageUrl: form.imageUrl || null,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      isActive: form.isActive,
    };
    if (editing?.isActive && !payload.isActive) {
      const confirmed = window.confirm(`Deactivate placement ${editing.name}? Its configuration history remains available.`);
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) await api.patch(`/commercial/sponsors/${editing.id}`, payload);
      else await api.post("/commercial/sponsors", payload);
      await load();
      startCreate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The sponsorship placement could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(placement: SponsorPlacement) {
    const reason = window.prompt(`Reason for deactivating ${placement.name}`);
    if (!reason?.trim()) return;
    const confirmed = window.confirm(`Confirm deactivation of ${placement.name}.`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/commercial/sponsors/${placement.id}/deactivate`, { reason });
      await load();
      if (editing?.id === placement.id) startCreate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The sponsorship placement could not be deactivated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Sponsors / Ads" description="Sponsored placement configuration and campaign windows." />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Active</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.active}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Scheduled</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.scheduled}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Ended</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.ended}</div></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 sm:grid-cols-[180px_minmax(220px,1fr)]">
              <Field label="State"><Select value={state} onChange={(event) => { setState(event.target.value as SponsorPlacementState | ""); setPlacements(null); }}><option value="">Any state</option><option value="ACTIVE">Active</option><option value="SCHEDULED">Scheduled</option><option value="ENDED">Ended</option></Select></Field>
              <Field label="Placement key"><Input placeholder="home_feed_top" value={placementKey} onChange={(event) => { setPlacementKey(event.target.value); setPlacements(null); }} /></Field>
            </div>
          </Card>

          {placements === null && !error && <EmptyState message="Loading sponsorships..." />}
          {placements?.length === 0 && <EmptyState message="No active sponsorships" />}
          {placements && placements.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px]">
                <thead><tr><Th>Placement</Th><Th>Sponsor</Th><Th>Key</Th><Th>Window</Th><Th>State</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {placements.map((placement) => (
                    <tr key={placement.id}>
                      <Td><div className="font-semibold">{placement.name}</div><div className="max-w-xs truncate text-xs text-drift-text-secondary" title={placement.destinationUrl ?? undefined}>{placement.destinationUrl ?? "No destination URL"}</div></Td>
                      <Td>{placement.sponsorName}</Td>
                      <Td><span className="font-mono text-xs">{placement.placementKey}</span></Td>
                      <Td>{dateLabel(placement.startsAt)} - {dateLabel(placement.endsAt)}</Td>
                      <Td><Badge tone={statusTone(placement.state)}>{label(placement.state)}</Badge></Td>
                      <Td className="text-right"><div className="flex justify-end gap-3"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(placement)}>Edit</button>{placement.isActive && <button className="font-semibold text-drift-error hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" disabled={busy} onClick={() => void deactivate(placement)}>Deactivate</button>}</div></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">{editing ? "Edit placement" : "Create placement"}</h2><p className="mt-1 text-sm text-drift-text-secondary">Placement records configure sponsorship inventory; delivery remains outside this admin module.</p></div>
            {editing && <Button type="button" variant="ghost" onClick={startCreate}>New</Button>}
          </div>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Placement name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="Sponsor"><Input required value={form.sponsorName} onChange={(event) => setForm((current) => ({ ...current, sponsorName: event.target.value }))} /></Field>
            <Field label="Placement key"><Input required value={form.placementKey} onChange={(event) => setForm((current) => ({ ...current, placementKey: event.target.value }))} /></Field>
            <Field label="Destination URL"><Input type="url" value={form.destinationUrl} onChange={(event) => setForm((current) => ({ ...current, destinationUrl: event.target.value }))} /></Field>
            <Field label="Image URL"><Input type="url" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Starts"><Input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} /></Field>
              <Field label="Ends"><Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-drift-text-primary"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Save placement" : "Create placement"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
