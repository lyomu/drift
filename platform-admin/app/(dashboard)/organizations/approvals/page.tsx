"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { AdminApproval, ClubMembershipStatus } from "@/lib/organization-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Select, statusTone } from "@/components/ui";

function label(value: string) {
  return value.replaceAll("_", " ");
}

function personName(user: AdminApproval["user"]) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

export default function OrganizationApprovalsPage() {
  const [status, setStatus] = useState<ClubMembershipStatus | "ALL">("PENDING");
  const [clubId, setClubId] = useState("");
  const [approvals, setApprovals] = useState<AdminApproval[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (clubId) params.set("clubId", clubId);
      const response = await api.get<{ approvals: AdminApproval[] }>(`/organizations/approvals?${params.toString()}`);
      setApprovals(response.approvals);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Admin approvals could not be loaded.");
    }
  }, [clubId, status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStatus((params.get("status") as ClubMembershipStatus | "ALL" | null) ?? "PENDING");
    setClubId(params.get("clubId") ?? "");
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function decide(approval: AdminApproval, action: "APPROVE" | "REJECT") {
    const reason = action === "REJECT" ? window.prompt(`Reason for rejecting ${personName(approval.user)} as ${label(approval.role)} at ${approval.club.name}`) : "";
    if (reason === null) return;
    if (action === "REJECT" && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    if (!window.confirm(`Confirm ${action.toLowerCase()} for ${personName(approval.user)} at ${approval.club.name}.`)) return;
    setBusyId(approval.membershipId);
    setError(null);
    try {
      await api.patch(`/organizations/approvals/${approval.membershipId}`, { action, reason: reason.trim() || undefined });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The approval decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Admin approvals" description="Approve or reject pending club Owner/Admin requests with an immutable platform audit trail." />
      <ErrorBanner message={error} />
      <Card className="mb-5 max-w-sm p-4">
        <Select aria-label="Approval status" value={status} onChange={(event) => { setStatus(event.target.value as ClubMembershipStatus | "ALL"); setApprovals(null); }}>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Approved</option>
          <option value="SUSPENDED">Rejected / suspended</option>
          <option value="ALL">All statuses</option>
        </Select>
      </Card>

      {approvals === null && !error && <EmptyState message="Loading admin approvals..." />}
      {approvals?.length === 0 && <EmptyState message={status === "PENDING" ? "No pending approvals" : "No admin approvals match this status."} />}
      {approvals && approvals.length > 0 && (
        <div className="flex flex-col gap-4">
          {approvals.map((approval) => (
            <Card key={approval.membershipId}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-semibold text-drift-text-primary">{personName(approval.user)}</h2>
                    <Badge tone={statusTone(approval.status)}>{approval.status}</Badge>
                    <Badge tone="info">{label(approval.role)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-drift-text-secondary">Requested for <Link href={`/organizations/${approval.club.id}`} className="font-semibold text-drift-primary hover:underline">{approval.club.name}</Link> on {new Date(approval.createdAt).toLocaleString()}</p>
                  <p className="mt-2 text-sm text-drift-text-secondary">{approval.user.email} - club is {label(approval.club.platformStatus)} / {approval.club.verificationStatus}</p>
                </div>
                {approval.status === "PENDING" && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive" disabled={busyId === approval.membershipId} onClick={() => void decide(approval, "REJECT")}>Reject</Button>
                    <Button disabled={busyId === approval.membershipId} onClick={() => void decide(approval, "APPROVE")}>{busyId === approval.membershipId ? "Saving..." : "Approve"}</Button>
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
