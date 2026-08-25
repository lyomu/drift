"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { EscalatedModerationReport } from "@/lib/organization-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, PageHeader, Select, statusTone } from "@/components/ui";

function label(value: string) {
  return value.replaceAll("_", " ");
}

function personName(person: { firstName: string | null; lastName: string | null; email: string } | null) {
  if (!person) return "Deleted account";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
}

export default function OrganizationModerationPage() {
  const [status, setStatus] = useState<"ESCALATED" | "APPROVED" | "REMOVED">("ESCALATED");
  const [clubId, setClubId] = useState("");
  const [reports, setReports] = useState<EscalatedModerationReport[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (clubId) params.set("clubId", clubId);
      const response = await api.get<{ reports: EscalatedModerationReport[] }>(`/organizations/moderation?${params.toString()}`);
      setReports(response.reports);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Escalated moderation could not be loaded.");
    }
  }, [clubId, status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setClubId(params.get("clubId") ?? "");
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function decide(report: EscalatedModerationReport, action: "APPROVE" | "REMOVE") {
    const reason = window.prompt(action === "REMOVE" ? "Reason for removing this club-feed post" : "Reason for approving this escalated post");
    if (reason === null) return;
    if (!reason.trim()) {
      setError("A moderation decision reason is required.");
      return;
    }
    if (!window.confirm(`Confirm ${action === "REMOVE" ? "removal" : "approval"} for this escalated post from ${report.club.name}.`)) return;
    setBusyId(report.id);
    setError(null);
    try {
      await api.patch(`/organizations/moderation/${report.id}`, { action, reason });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The moderation decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Community moderation" description="Platform-level review of club-feed posts escalated from Club Admin moderation queues." />
      <ErrorBanner message={error} />

      <Card className="mb-5 max-w-sm p-4">
        <Field label="Moderation status"><Select value={status} onChange={(event) => { setStatus(event.target.value as "ESCALATED" | "APPROVED" | "REMOVED"); setReports(null); }}><option value="ESCALATED">Escalated</option><option value="APPROVED">Approved</option><option value="REMOVED">Removed</option></Select></Field>
      </Card>

      {reports === null && !error && <EmptyState message="Loading escalated content..." />}
      {reports?.length === 0 && <EmptyState message={status === "ESCALATED" ? "Nothing escalated" : "No moderation reports match this status."} />}
      {reports && reports.length > 0 && (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[76ch]">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(report.status)}>{label(report.status)}</Badge>
                    <Link href={`/organizations/${report.club.id}`} className="font-semibold text-drift-primary hover:underline">{report.club.name}</Link>
                    {report.post.deletedAt && <Badge tone="error">Post removed</Badge>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-drift-text-primary">{report.post.body}</p>
                  <p className="mt-3 text-sm text-drift-text-secondary"><span className="font-semibold">Reason:</span> {report.reason}</p>
                  <p className="mt-1 text-xs text-drift-text-secondary">Posted by {personName(report.post.author)} - reported by {personName(report.reporter)} - escalated {new Date(report.createdAt).toLocaleString()}</p>
                </div>
                {report.status === "ESCALATED" && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" disabled={busyId === report.id} onClick={() => void decide(report, "APPROVE")}>Approve post</Button>
                    <Button variant="destructive" disabled={busyId === report.id} onClick={() => void decide(report, "REMOVE")}>{busyId === report.id ? "Saving..." : "Remove post"}</Button>
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
