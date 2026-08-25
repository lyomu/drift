"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
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

type ReportType = "player" | "message" | "court";
type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

interface ReportRow {
  id: string;
  reason: string;
  notes: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { email: string; firstName: string | null; lastName: string | null };
  reported?: { email: string; firstName: string | null; lastName: string | null };
  message?: { body: string; senderId: string } | null;
  court?: { name: string; address: string | null } | null;
}

const TABS: { key: ReportType; label: string }[] = [
  { key: "player", label: "Players" },
  { key: "message", label: "Messages" },
  { key: "court", label: "Courts" },
];

function subjectLine(type: ReportType, row: ReportRow): string {
  if (type === "player") {
    const who = row.reported
      ? [row.reported.firstName, row.reported.lastName].filter(Boolean).join(" ") ||
        row.reported.email
      : "unknown";
    return `Reported player: ${who}`;
  }
  if (type === "message") {
    return `Reported message: "${row.message?.body?.slice(0, 80) ?? ""}"`;
  }
  return `Reported court: ${row.court?.name ?? "unknown"}${row.court?.address ? ` — ${row.court.address}` : ""}`;
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("player");
  const [status, setStatus] = useState<ReportStatus | "">("OPEN");
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(null);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await api.get<{ reports: ReportRow[] }>(
        `/reports/${type}?${params.toString()}`,
      );
      setRows(res.reports);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load reports.");
    }
  }, [type, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(id: string, next: Exclude<ReportStatus, "OPEN">) {
    setBusyId(id);
    try {
      await api.patch(`/reports/${type}/${id}`, { status: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Every player, message, and court report on the platform. Transitions are audited."
      />
      <ErrorBanner message={error} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-md border border-drift-border p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`rounded px-3 py-1.5 text-sm font-semibold ${
                  type === t.key
                    ? "bg-drift-primary-light text-drift-primary-dark"
                    : "text-drift-text-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus | "")}
            className="max-w-[180px]"
          >
            <option value="">Any status</option>
            <option value="OPEN">Open</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </Select>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading…" />}
      {rows?.length === 0 && <EmptyState message={`No ${status || ""} ${type} reports.`} />}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                <span className="text-xs text-drift-text-secondary">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-sm font-semibold text-drift-text-primary">
                {r.reason.replace(/_/g, " ")} · {subjectLine(type, r)}
              </div>
              {r.notes && (
                <p className="mt-1 text-sm text-drift-text-secondary">
                  Reporter note: “{r.notes}”
                </p>
              )}
              <p className="mt-1 text-xs text-drift-text-secondary">
                Reported by{" "}
                {[r.reporter.firstName, r.reporter.lastName]
                  .filter(Boolean)
                  .join(" ") || r.reporter.email}
              </p>
              {r.status !== "RESOLVED" && r.status !== "DISMISSED" && (
                <div className="mt-4 flex gap-2">
                  {r.status === "OPEN" && (
                    <Button
                      variant="secondary"
                      disabled={busyId === r.id}
                      onClick={() => transition(r.id, "REVIEWING")}
                    >
                      Start review
                    </Button>
                  )}
                  <Button
                    disabled={busyId === r.id}
                    onClick={() => transition(r.id, "RESOLVED")}
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busyId === r.id}
                    onClick={() => transition(r.id, "DISMISSED")}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
