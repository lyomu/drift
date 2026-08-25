"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { VenueVerificationRequest } from "@/lib/venue-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, PageHeader, Select, Textarea, statusTone } from "@/components/ui";

export default function VenueVerificationsPage() {
  const [status, setStatus] = useState("PENDING");
  const [requests, setRequests] = useState<VenueVerificationRequest[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await api.get<{ requests: VenueVerificationRequest[] }>(`/venues/verifications${params}`);
      setRequests(response.requests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification requests could not be loaded.");
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function decide(request: VenueVerificationRequest, action: "APPROVE" | "REJECT" | "REQUEST_MORE_INFO") {
    const note = notes[request.id]?.trim() ?? "";
    if (action !== "APPROVE" && !note) {
      setError("Add a reason before rejecting or requesting more information.");
      return;
    }
    const label = action === "APPROVE" ? "approve" : action === "REJECT" ? "reject" : "request more information for";
    if (!window.confirm(`Confirm that you want to ${label} ${request.club.name}?`)) return;
    setBusyId(request.id);
    setError(null);
    try {
      await api.patch(`/venues/verifications/${request.id}`, { action, note: note || undefined });
      setNotes((current) => ({ ...current, [request.id]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The verification decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Verification workflow" description="Review club-submitted evidence and leave a clear, audited decision trail." />
      <ErrorBanner message={error} />
      <Card className="mb-5 max-w-xs p-4"><Field label="Request status"><Select value={status} onChange={(event) => { setStatus(event.target.value); setRequests(null); }}><option value="PENDING">Pending</option><option value="MORE_INFO">More information requested</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="">All requests</option></Select></Field></Card>

      {requests === null && !error && <EmptyState message="Loading verification requests…" />}
      {requests?.length === 0 && <EmptyState message={status === "PENDING" ? "No pending verifications" : "No verification requests match this status."} />}

      {requests && requests.length > 0 && (
        <div className="flex flex-col gap-4">
          {requests.map((request) => {
            const submitter = [request.submittedBy.firstName, request.submittedBy.lastName].filter(Boolean).join(" ") || request.submittedBy.email || "Club administrator";
            return (
              <Card key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-semibold text-drift-text-primary">{request.club.name}</h2><Badge tone={statusTone(request.status)}>{request.status.replaceAll("_", " ")}</Badge></div>
                    <p className="mt-1 text-sm text-drift-text-secondary">Submitted by {submitter} on {new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right text-sm text-drift-text-secondary"><div>{request.club._count.courts} courts</div><div>{request.club._count.memberships} members</div></div>
                </div>

                <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
                  <div><dt className="font-semibold text-drift-text-secondary">Address</dt><dd className="mt-0.5 text-drift-text-primary">{request.club.address ?? "Not supplied"}</dd></div>
                  <div><dt className="font-semibold text-drift-text-secondary">Coordinates</dt><dd className="mt-0.5 text-drift-text-primary">{request.club.latitude !== null && request.club.longitude !== null ? `${request.club.latitude}, ${request.club.longitude}` : "Not supplied"}</dd></div>
                  <div><dt className="font-semibold text-drift-text-secondary">Contact</dt><dd className="mt-0.5 text-drift-text-primary">{request.club.phone ?? "No phone"}{request.club.website ? ` · ${request.club.website}` : ""}</dd></div>
                  <div><dt className="font-semibold text-drift-text-secondary">Description</dt><dd className="mt-0.5 text-drift-text-primary">{request.club.description ?? "Not supplied"}</dd></div>
                </dl>

                {request.decisionNote && <div className="mt-5 rounded-md bg-drift-background px-4 py-3 text-sm text-drift-text-primary"><strong>Decision note:</strong> {request.decisionNote}{request.reviewedBy && <span className="text-drift-text-secondary"> · {request.reviewedBy.name ?? request.reviewedBy.email}</span>}</div>}

                {request.status === "PENDING" && (
                  <div className="mt-5 border-t border-drift-border pt-5">
                    <Field label="Decision note (required for rejection or more information)"><Textarea rows={3} value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Name the missing evidence or the reason for rejection." /></Field>
                    <div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busyId === request.id} onClick={() => void decide(request, "REQUEST_MORE_INFO")}>Request more info</Button><Button variant="destructive" disabled={busyId === request.id} onClick={() => void decide(request, "REJECT")}>Reject</Button><Button disabled={busyId === request.id} onClick={() => void decide(request, "APPROVE")}>{busyId === request.id ? "Saving…" : "Approve"}</Button></div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
