"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { BillingPlan, BillingSubscriptionStatus, OrganizationBilling } from "@/lib/organization-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

type SubscriptionRow = {
  id: string;
  name: string;
  platformStatus: string;
  memberCount: number;
  billing: OrganizationBilling;
};

type SubscriptionDetail = {
  club: {
    id: string;
    name: string;
    platformStatus: string;
    billing: OrganizationBilling;
  };
  plans: BillingPlan[];
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
}

export default function OrganizationSubscriptionsPage() {
  const [status, setStatus] = useState<BillingSubscriptionStatus | "">("");
  const [rows, setRows] = useState<SubscriptionRow[] | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);
  const [form, setForm] = useState({ planId: "", status: "ACTIVE" as BillingSubscriptionStatus, currentPeriodEnd: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const response = await api.get<{ clubs: SubscriptionRow[] }>(`/organizations/subscriptions?${params.toString()}`);
      setRows(response.clubs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Subscription statuses could not be loaded.");
    }
  }, [status]);

  const loadDetail = useCallback(async (clubId: string) => {
    if (!clubId) {
      setDetail(null);
      return;
    }
    setError(null);
    try {
      const response = await api.get<SubscriptionDetail>(`/organizations/${clubId}/subscription`);
      setDetail(response);
      setForm({
        planId: response.club.billing.subscription?.plan.id ?? response.plans[0]?.id ?? "",
        status: response.club.billing.subscription?.status ?? "ACTIVE",
        currentPeriodEnd: response.club.billing.subscription?.currentPeriodEnd?.slice(0, 10) ?? "",
        reason: "",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Subscription detail could not be loaded.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialClubId = params.get("clubId") ?? "";
    if (initialClubId) setSelectedClubId(initialClubId);
  }, []);
  useEffect(() => { void loadRows(); }, [loadRows]);
  useEffect(() => { void loadDetail(selectedClubId); }, [loadDetail, selectedClubId]);

  async function override(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    if (!form.reason.trim()) {
      setError("A support override reason is required.");
      return;
    }
    if (!window.confirm(`Confirm subscription override for ${detail.club.name}. This does not charge a payment provider.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/organizations/${detail.club.id}/subscription`, {
        planId: form.planId,
        status: form.status,
        currentPeriodEnd: form.currentPeriodEnd || undefined,
        reason: form.reason,
      });
      await Promise.all([loadRows(), loadDetail(detail.club.id)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The subscription override could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Subscription status" description="Club subscription state, renewal facts, invoice history, and audited support overrides." />
      <ErrorBanner message={error} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="mb-4 max-w-xs p-4">
            <Field label="Subscription status"><Select value={status} onChange={(event) => { setStatus(event.target.value as BillingSubscriptionStatus | ""); setRows(null); }}><option value="">Any status</option><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="CANCELLED">Cancelled</option></Select></Field>
          </Card>

          {rows === null && !error && <EmptyState message="Loading subscription statuses..." />}
          {rows?.length === 0 && <EmptyState message="No club subscriptions match this status." />}
          {rows && rows.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[860px]">
                <thead><tr><Th>Club</Th><Th>Plan</Th><Th>Status</Th><Th>Renewal</Th><Th>Revenue by currency</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <Td><div className="font-semibold">{row.name}</div><div className="text-xs text-drift-text-secondary">{row.memberCount} members - {label(row.platformStatus)}</div></Td>
                      <Td>{row.billing.subscription?.plan.name ?? "Not configured"}</Td>
                      <Td>{row.billing.subscription ? <Badge tone={statusTone(row.billing.subscription.status)}>{label(row.billing.subscription.status)}</Badge> : <span className="text-sm text-drift-text-secondary">No subscription</span>}</Td>
                      <Td>{row.billing.subscription ? new Date(row.billing.subscription.currentPeriodEnd).toLocaleDateString() : "n/a"}</Td>
                      <Td>{row.billing.totalsByCurrency.length ? row.billing.totalsByCurrency.map((total) => <div key={total.currency} className="text-sm">{total.currency}: {money(total.paidMinor, total.currency)} paid - {money(total.failedMinor, total.currency)} failed</div>) : <span className="text-sm text-drift-text-secondary">No invoices</span>}</Td>
                      <Td className="text-right"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => setSelectedClubId(row.id)}>Open status</button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          {!selectedClubId && <EmptyState message="Select a club to view or adjust its subscription." />}
          {selectedClubId && !detail && !error && <EmptyState message="Loading subscription detail..." />}
          {detail && (
            <div>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-drift-text-primary">{detail.club.name}</h2>
                  <Link href={`/organizations/${detail.club.id}`} className="text-sm font-semibold text-drift-primary hover:underline">Open club detail</Link>
                </div>
                {detail.club.billing.subscription && <Badge tone={statusTone(detail.club.billing.subscription.status)}>{label(detail.club.billing.subscription.status)}</Badge>}
              </div>
              {detail.club.billing.subscription ? (
                <dl className="mb-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Plan</dt><dd className="font-semibold">{detail.club.billing.subscription.plan.name}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Amount</dt><dd>{money(detail.club.billing.subscription.plan.priceMinor, detail.club.billing.subscription.plan.currency)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Renewal</dt><dd>{new Date(detail.club.billing.subscription.currentPeriodEnd).toLocaleDateString()}</dd></div>
                </dl>
              ) : <div className="mb-5"><EmptyState message="This club has no subscription record yet." /></div>}

              <form onSubmit={override} className="flex flex-col gap-4 border-t border-drift-border pt-5">
                <Field label="Plan"><Select required value={form.planId} onChange={(event) => setForm((current) => ({ ...current, planId: event.target.value }))}>{detail.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {money(plan.priceMinor, plan.currency)} / {plan.interval.toLowerCase()}</option>)}</Select></Field>
                <Field label="Status"><Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BillingSubscriptionStatus }))}><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="CANCELLED">Cancelled</option></Select></Field>
                <Field label="Renewal date"><Input type="date" value={form.currentPeriodEnd} onChange={(event) => setForm((current) => ({ ...current, currentPeriodEnd: event.target.value }))} /></Field>
                <Field label="Support override reason"><Input required value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reference the support case or business reason." /></Field>
                <Button type="submit" disabled={busy || !form.planId}>{busy ? "Saving..." : "Save support override"}</Button>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
