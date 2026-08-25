"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { BillingAudience, CommercialTransaction, PaymentDetailResponse, PaymentsResponse, PaymentTransactionStatus } from "@/lib/commercial-types";
import { dateLabel, dateTimeLabel, label, money } from "@/lib/commercial-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

export default function CommercialPaymentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentTransactionStatus | "">("");
  const [audience, setAudience] = useState<BillingAudience | "">("");
  const [currency, setCurrency] = useState("");
  const [rows, setRows] = useState<PaymentsResponse | null>(null);
  const [detail, setDetail] = useState<CommercialTransaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ take: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (audience) params.set("audience", audience);
      if (currency.trim()) params.set("currency", currency.trim().toUpperCase());
      const response = await api.get<PaymentsResponse>(`/commercial/payments?${params.toString()}`);
      setRows(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transactions could not be loaded.");
    }
  }, [audience, currency, search, status]);

  useEffect(() => { void load(); }, [load]);

  async function openTransaction(id: string) {
    setError(null);
    try {
      const response = await api.get<PaymentDetailResponse>(`/commercial/payments/${id}`);
      setDetail(response.transaction);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transaction detail could not be loaded.");
    }
  }

  async function refund(transaction: CommercialTransaction) {
    const reason = window.prompt(`Refund reason for invoice ${transaction.invoice.number}`);
    if (!reason?.trim()) return;
    const confirmed = window.confirm("Confirm this audited refund status update. Provider refund execution must already be handled outside Drift.");
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<PaymentDetailResponse>(`/commercial/payments/${transaction.id}/refund`, { reason });
      setDetail(response.transaction);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The transaction could not be marked refunded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Invoices / Payments" description="Transaction ledger with currency-separated totals and audited refund status updates." />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {(rows?.totalsByCurrency.length ? rows.totalsByCurrency : [{ currency: "USD", collectedMinor: 0, refundedMinor: 0, failedMinor: 0, transactions: 0 }]).map((total) => (
          <Card key={total.currency} className="p-4">
            <div className="text-xs font-semibold uppercase text-drift-text-secondary">{total.currency}</div>
            <div className="mt-1 text-xl font-bold text-drift-text-primary">{money(total.collectedMinor, total.currency)}</div>
            <div className="mt-1 text-xs text-drift-text-secondary">{money(total.refundedMinor, total.currency)} refunded - {money(total.failedMinor, total.currency)} failed</div>
          </Card>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_150px_120px]">
          <Input aria-label="Search transactions" placeholder="Search invoice, description, reference..." value={search} onChange={(event) => { setSearch(event.target.value); setRows(null); }} />
          <Select aria-label="Status" value={status} onChange={(event) => { setStatus(event.target.value as PaymentTransactionStatus | ""); setRows(null); }}><option value="">Any status</option><option value="PENDING">Pending</option><option value="SUCCEEDED">Succeeded</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></Select>
          <Select aria-label="Audience" value={audience} onChange={(event) => { setAudience(event.target.value as BillingAudience | ""); setRows(null); }}><option value="">Any audience</option><option value="CLUB">Club</option><option value="PLAYER">Player</option></Select>
          <Input aria-label="Currency" placeholder="Currency" maxLength={3} value={currency} onChange={(event) => { setCurrency(event.target.value.toUpperCase()); setRows(null); }} />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {rows === null && !error && <EmptyState message="Loading transactions..." />}
          {rows?.transactions.length === 0 && <EmptyState message="No transactions yet" />}
          {rows && rows.transactions.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[960px]">
                <thead><tr><Th>Invoice</Th><Th>Owner</Th><Th>Amount</Th><Th>Status</Th><Th>Provider</Th><Th>Date</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {rows.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <Td><div className="font-semibold">{transaction.invoice.number}</div><div className="text-xs text-drift-text-secondary">{transaction.invoice.plan.name}</div></Td>
                      <Td><div>{transaction.owner.name}</div><div className="text-xs text-drift-text-secondary">{label(transaction.owner.type)}</div></Td>
                      <Td>{money(transaction.amountMinor, transaction.currency)}</Td>
                      <Td><Badge tone={statusTone(transaction.status)}>{label(transaction.status)}</Badge></Td>
                      <Td><div>{transaction.provider}</div><div className="max-w-[180px] truncate text-xs text-drift-text-secondary" title={transaction.providerReference ?? undefined}>{transaction.providerReference ?? "No reference"}</div></Td>
                      <Td>{dateLabel(transaction.createdAt)}</Td>
                      <Td className="text-right"><button className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary" onClick={() => void openTransaction(transaction.id)}>View transaction</button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-drift-text-secondary">Showing {rows.transactions.length} of {rows.total}</div>
            </Card>
          )}
        </div>

        <Card>
          {!detail && <EmptyState message="Select a transaction to inspect invoice, owner, and payment details." />}
          {detail && (
            <div>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">{detail.invoice.number}</h2><p className="mt-1 text-sm text-drift-text-secondary">{detail.owner.name}</p></div>
                <Badge tone={statusTone(detail.status)}>{label(detail.status)}</Badge>
              </div>
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Amount</dt><dd className="font-semibold">{money(detail.amountMinor, detail.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Audience</dt><dd>{label(detail.invoice.plan.audience)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Invoice status</dt><dd><Badge tone={statusTone(detail.invoice.status)}>{label(detail.invoice.status)}</Badge></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Period</dt><dd>{dateLabel(detail.invoice.periodStart)} - {dateLabel(detail.invoice.periodEnd)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Paid at</dt><dd>{dateTimeLabel(detail.invoice.paidAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Payment method</dt><dd>{detail.paymentMethodLabel}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-drift-text-secondary">Created</dt><dd>{dateTimeLabel(detail.createdAt)}</dd></div>
              </dl>
              {detail.failureReason && <div className="mt-5 rounded-md bg-drift-error-surface px-3 py-2 text-sm text-drift-error">{detail.failureReason}</div>}
              <div className="mt-6">
                <Button variant="destructive" disabled={busy || detail.status !== "SUCCEEDED"} onClick={() => void refund(detail)}>{busy ? "Recording..." : "Record refund"}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
