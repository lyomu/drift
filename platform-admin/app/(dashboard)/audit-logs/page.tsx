"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import {
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; email: string; name: string | null };
}

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(null);
      const params = new URLSearchParams();
      if (action) params.set("action", action);
      params.set("take", "200");
      const res = await api.get<unknown>(`/audit-logs?${params.toString()}`);
      // The endpoint returns a bare array.
      setRows(Array.isArray(res) ? (res as AuditRow[]) : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load audit log.");
    }
  }, [action]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Every platform-admin mutation, newest first. Entries are write-once."
      />
      <ErrorBanner message={error} />

      <Card className="mb-4 max-w-sm">
        <Field label="Filter by action (e.g. user.suspend)">
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Leave empty for everything"
          />
        </Field>
      </Card>

      {rows === null && !error && <EmptyState message="Loading…" />}
      {rows?.length === 0 && <EmptyState message="No audit entries yet." />}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Card key={r.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="rounded bg-drift-primary-light px-2 py-0.5 font-mono text-xs font-semibold text-drift-primary-dark">
                    {r.action}
                  </span>{" "}
                  <span className="text-sm text-drift-text-secondary">
                    on {r.entityType} ·{" "}
                    {r.actor.name ?? r.actor.email}
                  </span>
                </div>
                <div className="text-xs text-drift-text-secondary">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              {r.metadata != null && Object.keys(r.metadata).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded bg-drift-background p-2 text-xs text-drift-text-secondary">
                  {JSON.stringify(r.metadata, null, 2)}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
