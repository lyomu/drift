"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from "@/lib/support-types";
import { dateTime, label, personName } from "@/lib/support-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Textarea, Th, statusTone } from "@/components/ui";

type RequestForm = {
  userId: string;
  userEmail: string;
  type: PrivacyRequestType;
  requestNote: string;
};

const EMPTY_FORM: RequestForm = {
  userId: "",
  userEmail: "",
  type: "EXPORT",
  requestNote: "",
};

export default function PrivacyRequestsPage() {
  const [requests, setRequests] = useState<PrivacyRequest[] | null>(null);
  const [status, setStatus] = useState<PrivacyRequestStatus | "">("PENDING");
  const [type, setType] = useState<PrivacyRequestType | "">("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ requests: PrivacyRequest[] }>(`/support/privacy-requests?${params.toString()}`);
      setRequests(response.requests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Privacy requests could not be loaded.");
    }
  }, [search, status, type]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    pending: requests?.filter((request) => request.status === "PENDING").length ?? 0,
    fulfilled: requests?.filter((request) => request.status === "FULFILLED").length ?? 0,
    deletion: requests?.filter((request) => request.type === "DELETION").length ?? 0,
  }), [requests]);

  async function createRequest(event: React.FormEvent) {
    event.preventDefault();
    setBusyId("create");
    setError(null);
    try {
      await api.post("/support/privacy-requests", {
        userId: form.userId || null,
        userEmail: form.userEmail || null,
        type: form.type,
        requestNote: form.requestNote || null,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The privacy request could not be created.");
    } finally {
      setBusyId(null);
    }
  }

  async function processRequest(request: PrivacyRequest) {
    const fulfillmentNote = window.prompt(`Fulfillment note for ${label(request.type)} request`);
    if (!fulfillmentNote?.trim()) return;
    const message = request.type === "DELETION"
      ? `Process deletion for ${personName(request.user)}? This redacts direct account PII, revokes sessions, and preserves historical competition relations.`
      : `Fulfill export request for ${personName(request.user)}?`;
    if (!window.confirm(message)) return;
    setBusyId(request.id);
    setError(null);
    try {
      await api.post(`/support/privacy-requests/${request.id}/process`, { fulfillmentNote });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The privacy request could not be processed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Privacy Requests" description="Data export and deletion queue for compliance handling." />
      <ErrorBanner message={error} />
      <div className="mb-5 rounded-md border border-drift-warning/30 bg-drift-warning-surface px-4 py-3 text-sm leading-6 text-drift-warning">
        Deletion processing redacts direct account PII and revokes sessions while preserving historical match and competition relations for integrity.
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="text-sm font-semibold text-drift-text-secondary">Pending</div><div className="mt-1 font-display text-3xl font-bold tabular-nums text-drift-text-primary">{counts.pending}</div></Card>
        <Card className="p-4"><div className="text-sm font-semibold text-drift-text-secondary">Fulfilled</div><div className="mt-1 font-display text-3xl font-bold tabular-nums text-drift-text-primary">{counts.fulfilled}</div></Card>
        <Card className="p-4"><div className="text-sm font-semibold text-drift-text-secondary">Deletion requests</div><div className="mt-1 font-display text-3xl font-bold tabular-nums text-drift-text-primary">{counts.deletion}</div></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
              <Field label="Search"><Input value={search} onChange={(event) => { setSearch(event.target.value); setRequests(null); }} placeholder="User or note" /></Field>
              <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value as PrivacyRequestStatus | ""); setRequests(null); }}><option value="">Any status</option><option value="PENDING">Pending</option><option value="FULFILLED">Fulfilled</option></Select></Field>
              <Field label="Type"><Select value={type} onChange={(event) => { setType(event.target.value as PrivacyRequestType | ""); setRequests(null); }}><option value="">Any type</option><option value="EXPORT">Export</option><option value="DELETION">Deletion</option></Select></Field>
              <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => void load()}>Refresh</Button></div>
            </div>
          </Card>

          {requests === null && !error && <EmptyState message="Loading privacy requests..." />}
          {requests?.length === 0 && <EmptyState message={status === "PENDING" && !type && !search.trim() ? "No pending privacy requests" : "No privacy requests match these filters."} />}
          {requests && requests.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[960px]">
                <thead><tr><Th>User</Th><Th>Type</Th><Th>Status</Th><Th>Requested</Th><Th>Fulfilled</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <Td><Link href={`/users?query=${encodeURIComponent(request.user.email ?? request.user.id)}`} className="font-semibold text-drift-primary hover:underline">{personName(request.user)}</Link><div className="text-xs text-drift-text-secondary">{request.user.email ?? "Email redacted"}</div></Td>
                      <Td><Badge tone={request.type === "DELETION" ? "error" : "info"}>{label(request.type)}</Badge></Td>
                      <Td><Badge tone={statusTone(request.status)}>{label(request.status)}</Badge></Td>
                      <Td>{dateTime(request.createdAt)}{request.requestNote && <div className="max-w-xs truncate text-xs text-drift-text-secondary" title={request.requestNote}>{request.requestNote}</div>}</Td>
                      <Td>{request.fulfilledAt ? <>{dateTime(request.fulfilledAt)}<div className="text-xs text-drift-text-secondary">{request.processedBy ? personName(request.processedBy) : "Unknown staff"} / {request.hasExportSnapshot ? "snapshot stored" : "no snapshot"}</div></> : <span className="text-drift-text-secondary">Pending</span>}</Td>
                      <Td className="text-right">{request.status === "PENDING" ? <Button variant={request.type === "DELETION" ? "destructive" : "secondary"} disabled={busyId === request.id} onClick={() => void processRequest(request)}>{busyId === request.id ? "Processing..." : "Process request"}</Button> : <span className="text-xs text-drift-text-secondary">Fulfilled</span>}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <h2 className="font-display text-xl font-semibold text-drift-text-primary">Create request</h2>
          <p className="mt-1 text-sm text-drift-text-secondary">Use either a user ID or an email address to link the request to an account.</p>
          <form onSubmit={createRequest} className="mt-4 flex flex-col gap-4">
            <Field label="User ID"><Input value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} /></Field>
            <Field label="User email"><Input type="email" value={form.userEmail} onChange={(event) => setForm((current) => ({ ...current, userEmail: event.target.value }))} /></Field>
            <Field label="Request type"><Select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PrivacyRequestType }))}><option value="EXPORT">Export</option><option value="DELETION">Deletion</option></Select></Field>
            <Field label="Request note"><Textarea rows={4} value={form.requestNote} onChange={(event) => setForm((current) => ({ ...current, requestNote: event.target.value }))} /></Field>
            <Button type="submit" disabled={busyId === "create" || (!form.userId.trim() && !form.userEmail.trim())}>{busyId === "create" ? "Creating..." : "Create request"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
