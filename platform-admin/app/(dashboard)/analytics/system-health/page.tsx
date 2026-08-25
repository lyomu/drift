"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { HealthReport } from "@/lib/analytics-types";
import type { CurrentPlatformAdmin } from "@/lib/access-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, statusTone } from "@/components/ui";

export default function SystemHealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [canAcknowledge, setCanAcknowledge] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, admin] = await Promise.all([
        api.get<HealthReport>("/analytics/health"),
        api.get<CurrentPlatformAdmin>("/auth/me"),
      ]);
      setReport(health);
      setCanAcknowledge(admin.role.permissions.includes("SUPPORT_MANAGE"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "System health could not be checked.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function acknowledge(serviceKey: string) {
    setBusyKey(serviceKey);
    setError(null);
    try {
      await api.post(`/analytics/health/${serviceKey}/acknowledge`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The incident could not be acknowledged.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="System health"
        description="Live service probes and API-instance telemetry. This view does not substitute synthetic uptime monitoring."
        action={<Button variant="secondary" disabled={loading} onClick={() => void load()}>{loading ? "Checking…" : "Check now"}</Button>}
      />
      <ErrorBanner message={error} />
      {loading && !report && <EmptyState message="Checking API and infrastructure…" />}

      {report && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-drift-border bg-drift-surface px-5 py-4 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-drift-text-secondary">Platform status</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={statusTone(report.overallStatus)}>{report.overallStatus}</Badge>
                <span className="text-sm text-drift-text-secondary">Checked {new Date(report.checkedAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="text-sm text-drift-text-secondary">{report.services.filter((service) => service.status === "HEALTHY").length} of {report.services.length} services healthy</div>
          </div>

          <div className="flex flex-col gap-3">
            {report.services.map((service) => (
              <Card key={service.key} className="p-0">
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-drift-text-primary">{service.name}</h2>
                      <Badge tone={statusTone(service.status)}>{service.status}</Badge>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-drift-text-secondary">{service.detail}</p>
                    {service.acknowledgement && (
                      <p className="mt-2 text-xs text-drift-text-secondary">Acknowledged by {service.acknowledgement.by} on {new Date(service.acknowledgement.at).toLocaleString()}</p>
                    )}
                  </div>
                  <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-2 lg:text-right">
                    <div><dt className="text-xs font-semibold text-drift-text-secondary">Latency</dt><dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-drift-text-primary">{service.latencyMs === null ? "Not reported" : `${service.latencyMs} ms`}</dd></div>
                    <div><dt className="text-xs font-semibold text-drift-text-secondary">Error rate</dt><dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-drift-text-primary">{service.errorRate === null ? "Not reported" : `${service.errorRate}%`}</dd></div>
                  </dl>
                </div>
                {service.status !== "HEALTHY" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-drift-border bg-drift-background px-5 py-3">
                    <span className="text-sm text-drift-text-secondary">This service needs operational attention.</span>
                    {canAcknowledge ? (
                      <Button variant="secondary" disabled={busyKey === service.key} onClick={() => void acknowledge(service.key)}>
                        {busyKey === service.key ? "Acknowledging…" : "Acknowledge incident"}
                      </Button>
                    ) : (
                      <span className="text-xs text-drift-text-secondary">Support permission is required to acknowledge incidents.</span>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
