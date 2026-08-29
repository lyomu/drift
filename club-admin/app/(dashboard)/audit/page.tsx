"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconChip, MaterialIcon, Panel, RowCard } from "@/components/dashboard-design";
import { Button, EmptyState, ErrorBanner, Input, PageHeader, Select } from "@/components/ui";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
};

function actorName(log: AuditRow) {
  return `${log.actor.firstName ?? ""} ${log.actor.lastName ?? ""}`.trim() || log.actor.email || "System";
}

export default function AuditPage() {
  const { clubId } = useClub();
  const [logs, setLogs] = useState<AuditRow[] | null>(null);
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const query = new URLSearchParams();
      if (action) query.set("action", action);
      if (actorId) query.set("actorId", actorId);
      setLogs((await api.get<{ logs: AuditRow[] }>(`/clubs/${clubId}/audit-log?${query}`)).logs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The audit log could not be loaded.");
    }
  }, [clubId, action, actorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const actors = useMemo(
    () => Array.from(new Map((logs ?? []).map((log) => [log.actor.id, log.actor])).values()),
    [logs],
  );

  function exportCsv() {
    if (!logs) return;
    const esc = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      "Timestamp,User,Action,Entity,Entity ID",
      ...logs.map((log) =>
        [log.createdAt, actorName(log), log.action, log.entityType, log.entityId].map(esc).join(","),
      ),
    ].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "club-audit-log.csv");
  }

  return (
    <div>
      <PageHeader
        title="Club audit log"
        description="A durable history of consequential club administration actions."
        action={
          <Button variant="secondary" disabled={!logs?.length} onClick={exportCsv}>
            <MaterialIcon name="download" className="text-[18px]" />
            Export CSV
          </Button>
        }
      />
      <ErrorBanner message={error} />

      <Panel className="mb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action"
            aria-label="Filter by action"
          />
          <Select value={actorId} onChange={(e) => setActorId(e.target.value)} aria-label="Filter by user">
            <option value="">All users</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {`${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || actor.email}
              </option>
            ))}
          </Select>
        </div>
      </Panel>

      <Panel>
        {logs === null ? (
          <EmptyState message="Loading..." />
        ) : logs.length === 0 ? (
          <EmptyState message="No audited actions yet." />
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <RowCard key={log.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconChip icon="history" tone="neutral" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-drift-text-primary">
                        {log.action.replaceAll(".", " / ")}
                      </div>
                      <div className="mt-1 text-xs text-drift-text-secondary">
                        {actorName(log)} on {log.entityType}
                        {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                      </div>
                    </div>
                  </div>
                  <time className="shrink-0 text-[13px] font-semibold text-drift-text-secondary">
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                </div>
              </RowCard>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
