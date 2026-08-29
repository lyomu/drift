"use client";

import { useCallback, useEffect, useState } from "react";
import { IconChip, MaterialIcon, Panel, RowCard } from "@/components/dashboard-design";
import { Button, EmptyState, ErrorBanner, PageHeader, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { ModerationReport } from "@/lib/types";

export default function ModerationPage() {
  const { clubId } = useClub();
  const [status, setStatus] = useState<ModerationReport["status"]>("PENDING");
  const [reports, setReports] = useState<ModerationReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      setReports((await api.get<{ reports: ModerationReport[] }>(`/clubs/${clubId}/moderation?status=${status}`)).reports);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The moderation queue could not be loaded.");
    }
  }, [clubId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string, next: "APPROVED" | "REMOVED" | "ESCALATED") {
    if (!clubId) return;
    try {
      await api.patch(`/clubs/${clubId}/moderation/${id}`, { status: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The moderation decision could not be saved.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Moderation queue"
        description="Review reported club-feed posts, remove harmful content, or escalate platform-level concerns."
        action={
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ModerationReport["status"])}
            className="w-44"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REMOVED">Removed</option>
            <option value="ESCALATED">Escalated</option>
          </Select>
        }
      />
      <ErrorBanner message={error} />

      <Panel>
        {reports === null ? (
          <EmptyState message="Loading..." />
        ) : reports.length === 0 ? (
          <EmptyState message={status === "PENDING" ? "Nothing pending review." : "No resolved reports in this view."} />
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <RowCard key={report.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <IconChip icon="flag" tone={report.status === "PENDING" ? "warning" : "neutral"} />
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={report.status} />
                        <span className="text-xs text-drift-text-secondary">
                          Reported {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-drift-text-primary">
                        {report.post.body}
                      </p>
                      <p className="mt-3 text-sm text-drift-text-secondary">
                        <span className="font-semibold text-drift-text-primary">Reason:</span> {report.reason}
                      </p>
                    </div>
                  </div>
                  {report.status === "PENDING" && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => void resolve(report.id, "APPROVED")}>
                        <MaterialIcon name="check" className="text-[18px]" />
                        Approve
                      </Button>
                      <Button variant="destructive" onClick={() => void resolve(report.id, "REMOVED")}>
                        <MaterialIcon name="delete" className="text-[18px]" />
                        Remove
                      </Button>
                      <Button variant="ghost" onClick={() => void resolve(report.id, "ESCALATED")}>
                        Escalate
                      </Button>
                    </div>
                  )}
                </div>
              </RowCard>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
