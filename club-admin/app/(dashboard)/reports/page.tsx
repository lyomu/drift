"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { ErrorBanner, PageHeader, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import type { CourtReport, ReportStatus } from "@/lib/types";

const STATUSES: ReportStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"];

export default function ReportsPage() {
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [reports, setReports] = useState<CourtReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ reports: CourtReport[] }>(
      `/clubs/${clubId}/reports`,
    );
    setReports(res.reports);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleStatusChange(id: string, status: ReportStatus) {
    if (!clubId) return;
    setError(null);
    try {
      await api.patch(`/clubs/${clubId}/reports/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Court reports for this club — player and message reports are handled platform-wide, not here."
      />
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <DataTable
          rows={reports}
          rowKey={(r) => r.id}
          emptyMessage="No reports."
          columns={[
            { header: "Court", cell: (r) => r.courtName },
            { header: "Reason", cell: (r) => r.reason.replace(/_/g, " ") },
            { header: "Notes", cell: (r) => r.notes ?? "—" },
            {
              header: "Status",
              cell: (r) =>
                canManage ? (
                  <Select
                    value={r.status}
                    onChange={(e) =>
                      handleStatusChange(r.id, e.target.value as ReportStatus)
                    }
                    className="max-w-[160px]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <StatusBadge status={r.status} />
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
