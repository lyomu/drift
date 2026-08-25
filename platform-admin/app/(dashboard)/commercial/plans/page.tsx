"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { BillingAudience, BillingInterval, CommercialPlan, PlansResponse } from "@/lib/commercial-types";
import { label, money } from "@/lib/commercial-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Textarea, Th, statusTone } from "@/components/ui";

type PlanForm = {
  code: string;
  name: string;
  description: string;
  audience: BillingAudience;
  priceMinor: string;
  currency: string;
  interval: BillingInterval;
  entitlementsText: string;
  isActive: boolean;
  isTest: boolean;
  sortOrder: string;
};

const EMPTY_FORM: PlanForm = {
  code: "",
  name: "",
  description: "",
  audience: "CLUB",
  priceMinor: "0",
  currency: "USD",
  interval: "MONTHLY",
  entitlementsText: "",
  isActive: true,
  isTest: false,
  sortOrder: "0",
};

function formFromPlan(plan: CommercialPlan): PlanForm {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? "",
    audience: plan.audience,
    priceMinor: String(plan.priceMinor),
    currency: plan.currency,
    interval: plan.interval,
    entitlementsText: plan.entitlements.join("\n"),
    isActive: plan.isActive,
    isTest: plan.isTest,
    sortOrder: String(plan.sortOrder),
  };
}

export default function CommercialPlansPage() {
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState("");
  const [plans, setPlans] = useState<CommercialPlan[] | null>(null);
  const [editing, setEditing] = useState<CommercialPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (audience) params.set("audience", audience);
      if (status) params.set("status", status);
      const response = await api.get<PlansResponse>(`/commercial/plans?${params.toString()}`);
      setPlans(response.plans);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Plans could not be loaded.");
    }
  }, [audience, status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    activePlans: plans?.filter((plan) => plan.isActive).length ?? 0,
    activeSubs: plans?.reduce((sum, plan) => sum + (plan.subscriptionCounts.ACTIVE ?? 0), 0) ?? 0,
    currencies: new Set(plans?.map((plan) => plan.currency) ?? []).size,
  }), [plans]);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(plan: CommercialPlan) {
    setEditing(plan);
    setForm(formFromPlan(plan));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      audience: form.audience,
      priceMinor: Number(form.priceMinor),
      currency: form.currency,
      interval: form.interval,
      entitlements: form.entitlementsText.split("\n").map((item) => item.trim()).filter(Boolean),
      isActive: form.isActive,
      isTest: form.isTest,
      sortOrder: Number(form.sortOrder || 0),
    };
    if (editing?.isActive && !payload.isActive && (editing.subscriptionCounts.ACTIVE ?? 0) > 0) {
      const confirmed = window.confirm(`Deactivate ${editing.name} while ${editing.subscriptionCounts.ACTIVE} active subscriptions still reference it? Existing subscription history will remain attached to this plan.`);
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) await api.patch(`/commercial/plans/${editing.id}`, payload);
      else await api.post("/commercial/plans", payload);
      await load();
      startCreate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The plan could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Plans" description="Subscription plan definitions, prices, and entitlement records." />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Active plans</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.activePlans}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Active subscriptions</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.activeSubs}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Currencies</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.currencies}</div></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Audience"><Select value={audience} onChange={(event) => { setAudience(event.target.value); setPlans(null); }}><option value="">Any audience</option><option value="CLUB">Club</option><option value="PLAYER">Player</option></Select></Field>
              <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value); setPlans(null); }}><option value="">Any status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></Field>
            </div>
          </Card>

          {plans === null && !error && <EmptyState message="Loading plans..." />}
          {plans?.length === 0 && <EmptyState message="No plans configured." />}
          {plans && plans.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[940px]">
                <thead><tr><Th>Plan</Th><Th>Audience</Th><Th>Price</Th><Th>Status</Th><Th>Subscriptions</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <Td><div className="font-semibold">{plan.name}</div><div className="text-xs text-drift-text-secondary">{plan.code}</div></Td>
                      <Td>{label(plan.audience)}</Td>
                      <Td>{money(plan.priceMinor, plan.currency)}<div className="text-xs text-drift-text-secondary">{label(plan.interval).toLowerCase()}</div></Td>
                      <Td><div className="flex flex-wrap gap-1.5"><Badge tone={statusTone(plan.isActive ? "ACTIVE" : "INACTIVE")}>{plan.isActive ? "Active" : "Inactive"}</Badge>{plan.isTest && <Badge tone="info">Test</Badge>}</div></Td>
                      <Td><div className="text-sm">{plan.subscriptionCounts.ACTIVE ?? 0} active</div><div className="text-xs text-drift-text-secondary">{plan.subscriptionCounts.PAST_DUE ?? 0} past due - {plan.subscriptionCounts.CANCELLED ?? 0} cancelled</div></Td>
                      <Td className="text-right"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => startEdit(plan)}>Edit</button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">{editing ? "Edit plan" : "Create plan"}</h2><p className="mt-1 text-sm text-drift-text-secondary">Amounts stay tied to their configured currency.</p></div>
            {editing && <Button type="button" variant="ghost" onClick={startCreate}>New</Button>}
          </div>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Code"><Input required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} /></Field>
            <Field label="Name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="Description"><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Audience"><Select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as BillingAudience }))}><option value="CLUB">Club</option><option value="PLAYER">Player</option></Select></Field>
              <Field label="Interval"><Select value={form.interval} onChange={(event) => setForm((current) => ({ ...current, interval: event.target.value as BillingInterval }))}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></Select></Field>
              <Field label="Currency"><Input required minLength={3} maxLength={3} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></Field>
              <Field label="Amount, minor units"><Input required type="number" min={0} value={form.priceMinor} onChange={(event) => setForm((current) => ({ ...current, priceMinor: event.target.value }))} /></Field>
            </div>
            <Field label="Entitlements"><Textarea rows={4} value={form.entitlementsText} onChange={(event) => setForm((current) => ({ ...current, entitlementsText: event.target.value }))} placeholder="One entitlement per line" /></Field>
            <Field label="Sort order"><Input type="number" min={0} value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} /></Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-drift-text-primary"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-drift-text-primary"><input type="checkbox" checked={form.isTest} onChange={(event) => setForm((current) => ({ ...current, isTest: event.target.checked }))} /> Test plan</label>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : editing ? "Save plan" : "Create plan"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
