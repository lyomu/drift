"use client";

import { useEffect, useState } from "react";
import {
  IconChip,
  MaterialIcon,
  ModalShell,
  Panel,
  RowCard,
  SectionTitle,
} from "@/components/dashboard-design";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type {
  BillingInvoice,
  BillingPaymentMethod,
  BillingPlan,
  ClubBilling,
} from "@/lib/types";

function money(amountMinor: number, currency: string) {
  return amountMinor === 0 ? "Free" : `${currency} ${(amountMinor / 100).toFixed(2)}`;
}

function date(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function intervalUnit(interval: BillingPlan["interval"]) {
  return interval === "YEARLY" ? "year" : "month";
}

export default function BillingPage() {
  const { clubId, role } = useClub();
  const isOwner = role === "OWNER";
  const [billing, setBilling] = useState<ClubBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [savingMethod, setSavingMethod] = useState(false);
  const [methodType, setMethodType] = useState<"CARD" | "MOBILE_MONEY">("CARD");
  const [brand, setBrand] = useState("Card");
  const [last4, setLast4] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId || !isOwner) return;
    let cancelled = false;
    api
      .get<ClubBilling>(`/clubs/${clubId}/billing`)
      .then((response) => {
        if (!cancelled) {
          setBilling(response);
          setError(null);
          setLoading(false);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof ApiError ? reason.message : "Failed to load billing.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, isOwner]);

  async function refreshBilling() {
    if (!clubId) return;
    const response = await api.get<ClubBilling>(`/clubs/${clubId}/billing`);
    setBilling(response);
  }

  async function changePlan(plan: BillingPlan) {
    if (!clubId || !billing) return;
    if (plan.priceMinor > 0 && billing.paymentMethods.length === 0) {
      setError("Add a payment method before selecting a paid plan.");
      return;
    }
    setProcessingPlanId(plan.id);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/clubs/${clubId}/billing/subscription`, { planId: plan.id });
      await refreshBilling();
      setSuccess(`${plan.name} is now the club's active plan.`);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "The payment could not be completed. Retry or use another method.",
      );
    } finally {
      setProcessingPlanId(null);
    }
  }

  async function addMethod(event: React.FormEvent) {
    event.preventDefault();
    if (!clubId) return;
    if (!/^\d{4}$/.test(last4)) {
      setError("Enter exactly four display digits for the tokenized method.");
      return;
    }
    setSavingMethod(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/clubs/${clubId}/billing/methods`, {
        type: methodType,
        last4,
        ...(methodType === "CARD" && brand.trim() ? { brand: brand.trim() } : {}),
      });
      setLast4("");
      await refreshBilling();
      setSuccess("Payment method saved.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Failed to save the payment method.");
    } finally {
      setSavingMethod(false);
    }
  }

  async function removeMethod(method: BillingPaymentMethod) {
    if (!clubId || !window.confirm(`Remove ${method.label}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/clubs/${clubId}/billing/methods/${method.id}`);
      await refreshBilling();
      setSuccess("Payment method removed.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Failed to remove the payment method.");
    }
  }

  async function openInvoice(invoice: BillingInvoice) {
    if (!clubId) return;
    setLoadingInvoiceId(invoice.id);
    setError(null);
    try {
      const response = await api.get<{ receipt: BillingInvoice }>(
        `/clubs/${clubId}/billing/invoices/${invoice.id}`,
      );
      setSelectedInvoice(response.receipt);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "The invoice could not be loaded.");
    } finally {
      setLoadingInvoiceId(null);
    }
  }

  if (!isOwner) {
    return (
      <div>
        <PageHeader title="Billing" />
        <ErrorBanner message="Only the club owner can view or change billing." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Billing & subscription"
        description="Manage the club plan, tokenized payment methods, and invoices."
      />
      <ErrorBanner message={error} />
      {success && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-drift-success/20 bg-drift-success-surface px-4 py-3 text-sm font-semibold text-drift-success"
        >
          {success}
        </div>
      )}

      {loading || !billing ? (
        !error && <EmptyState message="Loading..." />
      ) : (
        <div className="flex flex-col gap-6">
          {billing.sandbox && (
            <Panel className="border-drift-warning/25 bg-drift-warning-surface/70">
              <div className="flex items-start gap-3 text-sm text-drift-text-primary">
                <IconChip icon="science" tone="warning" />
                <p className="leading-6">
                  Sandbox billing uses XTS test currency and provider tokens. No real payment will be taken.
                </p>
              </div>
            </Panel>
          )}

          <Panel>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-extrabold tracking-[-0.2px] text-drift-text-primary">
                    {billing.subscription.plan.name}
                  </h2>
                  <StatusBadge status={billing.subscription.status} />
                </div>
                <p className="mt-2 text-sm font-semibold text-drift-text-secondary">
                  {money(billing.subscription.plan.priceMinor, billing.subscription.plan.currency)}
                  {billing.subscription.plan.priceMinor > 0 &&
                    ` per ${intervalUnit(billing.subscription.plan.interval)}`}
                </p>
                <p className="mt-1 text-sm text-drift-text-secondary">
                  Current period ends {date(billing.subscription.currentPeriodEnd)}
                </p>
              </div>
              <PlanEntitlements entitlements={billing.subscription.plan.entitlements} />
            </div>
          </Panel>

          <section>
            <SectionTitle title="Available plans" />
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {billing.plans.map((plan) => {
                const current = plan.id === billing.subscription.plan.id;
                return (
                  <Panel key={plan.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-drift-text-primary">{plan.name}</h3>
                        <p className="mt-1 text-[15px] font-bold text-drift-primary-dark">
                          {money(plan.priceMinor, plan.currency)}
                          {plan.priceMinor > 0 && ` / ${intervalUnit(plan.interval)}`}
                        </p>
                      </div>
                      {current && <StatusBadge status="ACTIVE" />}
                    </div>
                    {plan.description && (
                      <p className="mt-3 text-sm leading-6 text-drift-text-secondary">{plan.description}</p>
                    )}
                    <PlanEntitlements entitlements={plan.entitlements} className="my-5 flex-1" />
                    <Button
                      onClick={() => changePlan(plan)}
                      disabled={current || processingPlanId !== null}
                      className="self-start"
                    >
                      {current
                        ? "Current plan"
                        : processingPlanId === plan.id
                          ? "Processing..."
                          : plan.priceMinor === 0
                            ? "Choose plan"
                            : "Select and pay"}
                    </Button>
                  </Panel>
                );
              })}
            </div>
          </section>

          <section>
            <SectionTitle title="Payment methods" />
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Panel>
                {billing.paymentMethods.length === 0 ? (
                  <EmptyState message="No payment method saved" />
                ) : (
                  <div className="space-y-2">
                    {billing.paymentMethods.map((method) => (
                      <RowCard key={method.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <IconChip icon={method.type === "CARD" ? "credit_card" : "phone_iphone"} tone="neutral" />
                            <div>
                              <div className="text-sm font-bold text-drift-text-primary">{method.label}</div>
                              <div className="mt-1 text-xs text-drift-text-secondary">
                                {method.provider} token{method.isDefault ? " / Default" : ""}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" onClick={() => removeMethod(method)}>
                            Remove
                          </Button>
                        </div>
                      </RowCard>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel>
                <form onSubmit={addMethod} className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-drift-text-primary">Add a tokenized method</h3>
                    <p className="mt-1 text-xs leading-5 text-drift-text-secondary">
                      Drift stores only the provider token and display digits.
                    </p>
                  </div>
                  <Field label="Method type">
                    <Select
                      value={methodType}
                      onChange={(event) => setMethodType(event.target.value as "CARD" | "MOBILE_MONEY")}
                    >
                      <option value="CARD">Card</option>
                      <option value="MOBILE_MONEY">Mobile money</option>
                    </Select>
                  </Field>
                  {methodType === "CARD" && (
                    <Field label="Card brand">
                      <Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. Visa" />
                    </Field>
                  )}
                  <Field label="Last four digits">
                    <Input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      value={last4}
                      onChange={(event) => setLast4(event.target.value.replace(/\D/g, ""))}
                    />
                  </Field>
                  <Button type="submit" disabled={savingMethod}>
                    <MaterialIcon name="add_card" className="text-[18px]" />
                    {savingMethod ? "Saving..." : "Save method"}
                  </Button>
                </form>
              </Panel>
            </div>
          </section>

          <Panel>
            <SectionTitle title="Invoices" />
            <div className="mt-4">
              {billing.invoices.length === 0 ? (
                <EmptyState message="No invoices yet." />
              ) : (
                <div className="space-y-2">
                  {billing.invoices.map((invoice) => (
                    <RowCard key={invoice.id}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <IconChip icon="receipt_long" tone="neutral" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-drift-text-primary">{invoice.number}</div>
                            <div className="mt-1 text-xs text-drift-text-secondary">
                              {invoice.plan.name} / {date(invoice.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-bold text-drift-text-primary">
                            {money(invoice.amountMinor, invoice.currency)}
                          </span>
                          <StatusBadge status={invoice.status} />
                          <Button
                            variant="ghost"
                            disabled={loadingInvoiceId === invoice.id}
                            onClick={() => void openInvoice(invoice)}
                          >
                            {loadingInvoiceId === invoice.id ? "Loading..." : "View"}
                          </Button>
                        </div>
                      </div>
                    </RowCard>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {selectedInvoice && (
        <ModalShell title={selectedInvoice.number} onClose={() => setSelectedInvoice(null)}>
          <p className="text-sm leading-6 text-drift-text-secondary">{selectedInvoice.description}</p>
          <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <InvoiceFact label="Amount" value={money(selectedInvoice.amountMinor, selectedInvoice.currency)} />
            <InvoiceFact label="Status" value={selectedInvoice.status} />
            <InvoiceFact label="Period" value={`${date(selectedInvoice.periodStart)} - ${date(selectedInvoice.periodEnd)}`} />
            <InvoiceFact
              label="Payment method"
              value={selectedInvoice.transaction?.paymentMethodLabel ?? "Not available"}
            />
          </dl>
          {selectedInvoice.transaction?.failureReason && (
            <p className="mt-4 text-sm font-semibold text-drift-error">
              {selectedInvoice.transaction.failureReason}
            </p>
          )}
        </ModalShell>
      )}
    </div>
  );
}

function PlanEntitlements({
  entitlements,
  className = "",
}: {
  entitlements: string[];
  className?: string;
}) {
  return (
    <ul className={`space-y-2 text-sm text-drift-text-primary ${className}`}>
      {entitlements.map((entitlement) => (
        <li key={entitlement} className="flex gap-2">
          <MaterialIcon name="check_circle" className="text-[18px] text-drift-success" />
          <span>{entitlement}</span>
        </li>
      ))}
    </ul>
  );
}

function InvoiceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-drift-neutral-surface p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.4px] text-drift-text-secondary">{label}</dt>
      <dd className="mt-1 font-semibold text-drift-text-primary">{value}</dd>
    </div>
  );
}
