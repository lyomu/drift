"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type {
  ClubCreationRequest,
  ClubCreationRequestStatus,
} from "@/lib/organization-types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";

type Filter = ClubCreationRequestStatus | "ALL";

export default function ClubRequestsPage() {
  const [status, setStatus] = useState<Filter>("PENDING");
  const [requests, setRequests] = useState<ClubCreationRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ requests: ClubCreationRequest[] }>(
        `/club-requests?status=${status}`,
      );
      setRequests(res.requests);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Club requests could not be loaded.",
      );
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(
    request: ClubCreationRequest,
    action: "APPROVE" | "REJECT",
  ) {
    let decisionNote: string | undefined;
    if (action === "REJECT") {
      const reason = window.prompt(
        `Reason for rejecting the request for "${request.clubName}"`,
      );
      if (reason === null) return;
      if (!reason.trim()) {
        setError("A rejection reason is required.");
        return;
      }
      decisionNote = reason.trim();
    }
    setBusyId(request.id);
    setError(null);
    try {
      const res = await api.patch<{
        request: ClubCreationRequest;
        devSetupUrl?: string;
      }>(`/club-requests/${request.id}`, { action, decisionNote });
      if (res.devSetupUrl) {
        setLinks((cur) => ({ ...cur, [request.id]: res.devSetupUrl! }));
      }
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The decision could not be saved.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Club requests"
        description="Prospective clubs waiting for approval. Approving one emails the requester a one-time setup link."
      />
      <ErrorBanner message={error} />

      <Card className="mb-5 max-w-sm p-4">
        <Select
          aria-label="Request status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as Filter);
            setRequests(null);
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </Select>
      </Card>

      {requests === null && !error && (
        <EmptyState message="Loading club requests..." />
      )}
      {requests?.length === 0 && (
        <EmptyState
          message={
            status === "PENDING"
              ? "No pending requests"
              : "No requests match this status."
          }
        />
      )}

      {requests && requests.length > 0 && (
        <div className="flex flex-col gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-semibold text-drift-text-primary">
                      {request.clubName}
                    </h2>
                    <Badge tone={statusTone(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-drift-text-secondary">
                    {request.location}
                  </p>
                  <p className="mt-2 text-sm text-drift-text-secondary">
                    {request.requesterName} · {request.requesterEmail} ·
                    requested {new Date(request.createdAt).toLocaleString()}
                  </p>
                  {request.decisionNote && (
                    <p className="mt-2 text-sm text-drift-text-secondary">
                      Note: {request.decisionNote}
                    </p>
                  )}
                  {links[request.id] && (
                    <p className="mt-3 break-all rounded-md bg-drift-neutral-surface px-3 py-2 text-[12.5px] text-drift-text-secondary">
                      Setup link (dev):{" "}
                      <button
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(links[request.id])
                        }
                        className="font-semibold text-drift-primary"
                      >
                        {links[request.id]} — copy
                      </button>
                    </p>
                  )}
                  {request.completedAt && (
                    <p className="mt-2 text-sm text-drift-success">
                      Setup completed {new Date(request.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {request.status === "PENDING" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      disabled={busyId === request.id}
                      onClick={() => void decide(request, "REJECT")}
                    >
                      Reject
                    </Button>
                    <Button
                      disabled={busyId === request.id}
                      onClick={() => void decide(request, "APPROVE")}
                    >
                      {busyId === request.id ? "Saving..." : "Approve"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
