"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type {
  BillingInvoice,
  BillingPaymentMethod,
  BillingPlan,
  ClubBilling,
} from "@/lib/types";

function money(amountMinor: number, currency: string) {
  return amountMinor === 0
    ? "Free"
    : `${currency} ${(amountMinor / 100).toFixed(2)}`;
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
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(
    null,
  );

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
          setError(
            reason instanceof ApiError
              ? reason.message
              : "Failed to load billing.",
          );
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
      await api.post(`/clubs/${clubId}/billing/subscription`, {
        planId: plan.id,
      });
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
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Failed to save the payment method.",
      );
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
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Failed to remove the payment method.",
      );
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
        title="Billing & Subscription"
        description="Manage the club plan, tokenized payment methods, and invoices."
      />
      <ErrorBanner message={error} />
      {success && (
        <div
          role="status"
          className="mb-4 rounded-md bg-drift-success-surface px-4 py-3 text-sm font-medium text-drift-success"
        >
          {success}
        </div>
      )}

      {loading || !billing ? (
        !error && <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {billing.sandbox && (
            <div className="flex items-start gap-3 rounded-lg bg-drift-warning-surface px-4 py-3 text-sm text-drift-text-primary">
              <span aria-hidden="true">◈</span>
              <p>
                Sandbox billing uses XTS test currency and provider tokens. No
                real payment will be taken.
              </p>
            </div>
          )}

          <section aria-labelledby="current-plan-heading">
            <h2
              id="current-plan-heading"
              className="mb-3 font-display text-xl font-semibold text-drift-text-primary"
            >
              Current plan
            </h2>
            <Card className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl font-bold text-drift-text-primary">
                    {billing.subscription.plan.name}
                  </h3>
                  <StatusBadge status={billing.subscription.status} />
                </div>
                <p className="mt-2 text-sm text-drift-text-secondary">
                  {money(
                    billing.subscription.plan.priceMinor,
                    billing.subscription.plan.currency,
                  )}{" "}
                  {billing.subscription.plan.priceMinor > 0 &&
                    `per ${intervalUnit(billing.subscription.plan.interval)}`}
                </p>
                <p className="mt-1 text-sm text-drift-text-secondary">
                  Current period ends {date(billing.subscription.currentPeriodEnd)}
                </p>
              </div>
              <ul className="space-y-2 text-sm text-drift-text-primary">
                {billing.subscription.plan.entitlements.map((entitlement) => (
                  <li key={entitlement} className="flex gap-2">
                    <span className="text-drift-success" aria-hidden="true">
                      ✓
                    </span>
                    {entitlement}
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section aria-labelledby="plans-heading">
            <h2
              id="plans-heading"
              className="mb-3 font-display text-xl font-semibold text-drift-text-primary"
            >
              Available plans
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {billing.plans.map((plan) => {
                const current = plan.id === billing.subscription.plan.id;
                return (
                  <Card key={plan.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-bold text-drift-text-primary">
                          {plan.name}
                        </h3>
                        <p className="mt-1 text-lg font-semibold text-drift-primary-dark">
                          {money(plan.priceMinor, plan.currency)}
                          {plan.priceMinor > 0 &&
                            ` / ${intervalUnit(plan.interval)}`}
                        </p>
                      </div>
                      {current && <StatusBadge status="ACTIVE" />}
                    </div>
                    {plan.description && (
                      <p className="mt-3 text-sm text-drift-text-secondary">
                        {plan.description}
                      </p>
                    )}
                    <ul className="my-5 flex-1 space-y-2 text-sm text-drift-text-primary">
                      {plan.entitlements.map((entitlement) => (
                        <li key={entitlement} className="flex gap-2">
                          <span className="text-drift-success" aria-hidden="true">
                            ✓
                          </span>
                          {entitlement}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => changePlan(plan)}
                      disabled={current || processingPlanId !== null}
                      className="self-start"
                    >
                      {current
                        ? "Current plan"
                        : processingPlanId === plan.id
                          ? "Processing…"
                          : plan.priceMinor === 0
                            ? "Choose plan"
                            : "Select and pay"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="methods-heading">
            <h2
              id="methods-heading"
              className="mb-3 font-display text-xl font-semibold text-drift-text-primary"
            >
              Payment methods
            </h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
              <Card>
                {billing.paymentMethods.length === 0 ? (
                  <div className="py-8 text-center text-sm text-drift-text-secondary">
                    No payment method saved
                  </div>
                ) : (
                  <div className="divide-y divide-drift-border">
                    {billing.paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <div className="font-semibold text-drift-text-primary">
                            {method.label}
                          </div>
                          <div className="text-xs text-drift-text-secondary">
                            {method.provider} token
                            {method.isDefault ? " · Default" : ""}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => removeMethod(method)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card>
                <form onSubmit={addMethod} className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-drift-text-primary">
                      Add a tokenized method
                    </h3>
                    <p className="mt-1 text-xs text-drift-text-secondary">
                      Drift stores only the provider token and display digits.
                    </p>
                  </div>
                  <Field label="Method type">
                    <Select
                      value={methodType}
                      onChange={(event) =>
                        setMethodType(
                          event.target.value as "CARD" | "MOBILE_MONEY",
                        )
                      }
                    >
                      <option value="CARD">Card</option>
                      <option value="MOBILE_MONEY">Mobile money</option>
                    </Select>
                  </Field>
                  {methodType === "CARD" && (
                    <Field label="Card brand">
                      <Input
                        value={brand}
                        onChange={(event) => setBrand(event.target.value)}
                        placeholder="e.g. Visa"
                      />
                    </Field>
                  )}
                  <Field label="Provider-tokenized last four digits">
                    <Input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      value={last4}
                      onChange={(event) =>
                        setLast4(event.target.value.replace(/\D/g, ""))
                      }
                    />
                  </Field>
                  <Button type="submit" disabled={savingMethod}>
                    {savingMethod ? "Saving…" : "Save method"}
                  </Button>
                </form>
              </Card>
            </div>
          </section>

          <section aria-labelledby="invoices-heading">
            <h2
              id="invoices-heading"
              className="mb-3 font-display text-xl font-semibold text-drift-text-primary"
            >
              Invoices
            </h2>
            <DataTable
              rows={billing.invoices}
              rowKey={(invoice) => invoice.id}
              emptyMessage="No invoices yet."
              columns={[
                { header: "Invoice", cell: (invoice) => invoice.number },
                { header: "Plan", cell: (invoice) => invoice.plan.name },
                {
                  header: "Date",
                  cell: (invoice) => date(invoice.createdAt),
                },
                {
                  header: "Amount",
                  cell: (invoice) => money(invoice.amountMinor, invoice.currency),
                },
                {
                  header: "Status",
                  cell: (invoice) => <StatusBadge status={invoice.status} />,
                },
                {
                  header: "",
                  cell: (invoice) => (
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      View invoice
                    </Button>
                  ),
                },
              ]}
            />
            {selectedInvoice && (
              <Card className="mt-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-drift-text-primary">
                      {selectedInvoice.number}
                    </h3>
                    <p className="mt-1 text-sm text-drift-text-secondary">
                      {selectedInvoice.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedInvoice(null)}
                  >
                    Close
                  </Button>
                </div>
                <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <InvoiceFact label="Amount" value={money(selectedInvoice.amountMinor, selectedInvoice.currency)} />
                  <InvoiceFact label="Status" value={selectedInvoice.status} />
                  <InvoiceFact label="Period" value={`${date(selectedInvoice.periodStart)} – ${date(selectedInvoice.periodEnd)}`} />
                  <InvoiceFact
                    label="Payment method"
                    value={selectedInvoice.transaction?.paymentMethodLabel ?? "Not available"}
                  />
                </dl>
                {selectedInvoice.transaction?.failureReason && (
                  <p className="mt-4 text-sm text-drift-error">
                    {selectedInvoice.transaction.failureReason}
                  </p>
                )}
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function InvoiceFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-drift-text-primary">{label}</dt>
      <dd className="mt-1 text-drift-text-secondary">{value}</dd>
    </div>
  );
}
