"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { BillingAudience, Promotion, PromotionDiscountType, PromotionState, PromotionsResponse } from "@/lib/commercial-types";
import { dateLabel, label, money } from "@/lib/commercial-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Textarea, Th, statusTone } from "@/components/ui";

type PromotionForm = {
  code: string;
  name: string;
  description: string;
  audience: BillingAudience | "";
  discountType: PromotionDiscountType;
  percentOff: string;
  amountOffMinor: string;
  currency: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  isActive: boolean;
};

const EMPTY_FORM: PromotionForm = {
  code: "",
  name: "",
  description: "",
  audience: "",
  discountType: "PERCENT",
  percentOff: "10",
  amountOffMinor: "",
  currency: "USD",
  startsAt: toLocalInput(new Date().toISOString()),
  endsAt: "",
  maxRedemptions: "",
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

function formFromPromotion(promotion: Promotion): PromotionForm {
  return {
    code: promotion.code,
    name: promotion.name,
    description: promotion.description ?? "",
    audience: promotion.audience ?? "",
    discountType: promotion.discountType,
    percentOff: promotion.percentOff ? String(promotion.percentOff) : "",
    amountOffMinor: promotion.amountOffMinor ? String(promotion.amountOffMinor) : "",
    currency: promotion.currency ?? "USD",
    startsAt: toLocalInput(promotion.startsAt),
    endsAt: toLocalInput(promotion.endsAt),
    maxRedemptions: promotion.maxRedemptions ? String(promotion.maxRedemptions) : "",
    isActive: promotion.isActive,
  };
}

function discountLabel(promotion: Promotion) {
  if (promotion.discountType === "PERCENT") return `${promotion.percentOff ?? 0}%`;
  return money(promotion.amountOffMinor ?? 0, promotion.currency ?? "USD");
}

export default function CommercialPromotionsPage() {
  const [status, setStatus] = useState<PromotionState | "">("");
  const [audience, setAudience] = useState<BillingAudience | "">("");
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromotionForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (audience) params.set("audience", audience);
      const response = await api.get<PromotionsResponse>(`/commercial/promotions?${params.toString()}`);
      setPromotions(response.promotions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Promotions could not be loaded.");
    }
  }, [audience, status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    active: promotions?.filter((promotion) => promotion.state === "ACTIVE").length ?? 0,
    expired: promotions?.filter((promotion) => promotion.state === "EXPIRED").length ?? 0,
  }), [promotions]);

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, startsAt: toLocalInput(new Date().toISOString()) });
  }

  function startEdit(promotion: Promotion) {
    setEditing(promotion);
    setForm(formFromPromotion(promotion));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      audience: form.audience || null,
      discountType: form.discountType,
      percentOff: form.discountType === "PERCENT" ? Number(form.percentOff) : null,
      amountOffMinor: form.discountType === "AMOUNT" ? Number(form.amountOffMinor) : null,
      currency: form.discountType === "AMOUNT" ? form.currency : null,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      isActive: form.isActive,
    };
    if (editing?.isActive && !payload.isActive) {
      const confirmed = window.confirm(`Deactivate promotion ${editing.code}? Existing history remains available.`);
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) await api.patch(`/commercial/promotions/${editing.id}`, payload);
      else await api.post("/commercial/promotions", payload);
      await load();
      startCreate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The promotion could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(promotion: Promotion) {
    const reason = window.prompt(`Reason for deactivating ${promotion.code}`);
    if (!reason?.trim()) return;
    const confirmed = window.confirm(`Confirm deactivation of ${promotion.code}.`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/commercial/promotions/${promotion.id}/deactivate`, { reason });
      await load();
      if (editing?.id === promotion.id) startCreate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The promotion could not be deactivated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Promotions" description="Promo codes and discount windows for player and club billing." />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Active</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.active}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Expired</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.expired}</div></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value as PromotionState | ""); setPromotions(null); }}><option value="">Any status</option><option value="ACTIVE">Active</option><option value="EXPIRED">Expired</option></Select></Field>
              <Field label="Audience"><Select value={audience} onChange={(event) => { setAudience(event.target.value as BillingAudience | ""); setPromotions(null); }}><option value="">Any audience</option><option value="CLUB">Club</option><option value="PLAYER">Player</option></Select></Field>
            </div>
          </Card>

          {promotions === null && !error && <EmptyState message="Loading promotions..." />}
          {promotions?.length === 0 && <EmptyState message="No active promotions" />}
          {promotions && promotions.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px]">
                <thead><tr><Th>Promotion</Th><Th>Audience</Th><Th>Discount</Th><Th>Window</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {promotions.map((promotion) => (
                    <tr key={promotion.id}>
                      <Td><div className="font-semibold">{promotion.name}</div><div className="text-xs text-drift-text-secondary">{promotion.code}</div></Td>
                      <Td>{promotion.audience ? label(promotion.audience) : "Any"}</Td>
                      <Td>{discountLabel(promotion)}</Td>
                      <Td>{dateLabel(promotion.startsAt)} - {dateLabel(promotion.endsAt)}<div className="text-xs text-drift-text-secondary">{promotion.maxRedemptions ? `${promotion.maxRedemptions} max` : "No cap"}</div></Td>
                      <Td><Badge tone={statusTone(promotion.state)}>{label(promotion.state)}</Badge></Td>
                      <Td className="text-right"><div className="flex justify-end gap-3"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(promotion)}>Edit</button>{promotion.isActive && <button className="font-semibold text-drift-error hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" disabled={busy} onClick={() => void deactivate(promotion)}>Deactivate</button>}</div></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">{editing ? "Edit promo" : "Create promo"}</h2><p className="mt-1 text-sm text-drift-text-secondary">Discount amounts are stored with their own currency.</p></div>
            {editing && <Button type="button" variant="ghost" onClick={startCreate}>New</Button>}
          </div>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Code"><Input required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} /></Field>
            <Field label="Name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="Description"><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Audience"><Select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as BillingAudience | "" }))}><option value="">Any</option><option value="CLUB">Club</option><option value="PLAYER">Player</option></Select></Field>
              <Field label="Discount type"><Select value={form.discountType} onChange={(event) => setForm((current) => ({ ...current, discountType: event.target.value as PromotionDiscountType }))}><option value="PERCENT">Percent</option><option value="AMOUNT">Amount</option></Select></Field>
              {form.discountType === "PERCENT" ? (
                <Field label="Percent off"><Input required type="number" min={1} max={100} value={form.percentOff} onChange={(event) => setForm((current) => ({ ...current, percentOff: event.target.value }))} /></Field>
              ) : (
                <>
                  <Field label="Amount, minor units"><Input required type="number" min={1} value={form.amountOffMinor} onChange={(event) => setForm((current) => ({ ...current, amountOffMinor: event.target.value }))} /></Field>
                  <Field label="Currency"><Input required minLength={3} maxLength={3} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></Field>
                </>
              )}
              <Field label="Starts"><Input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} /></Field>
              <Field label="Ends"><Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} /></Field>
              <Field label="Max redemptions"><Input type="number" min={1} value={form.maxRedemptions} onChange={(event) => setForm((current) => ({ ...current, maxRedemptions: event.target.value }))} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-drift-text-primary"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Save promo" : "Create promo"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
