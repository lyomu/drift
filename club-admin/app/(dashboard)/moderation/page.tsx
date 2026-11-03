"use client";

import { useCallback, useEffect, useState } from "react";
import { IconChip, MaterialIcon, Panel, RowCard } from "@/components/dashboard-design";
import { Button, EmptyState, ErrorBanner, PageHeader, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { ModerationReport } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

export default function ModerationPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { clubId } = useClub();
  const [status, setStatus] = useState<ModerationReport["status"]>("PENDING");
  const [reports, setReports] = useState<ModerationReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      setReports((await api.get<{ reports: ModerationReport[] }>(`/clubs/${clubId}/moderation?status=${status}`)).reports);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.theModerationQueueCouldNot"));
    }
  }, [clubId, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string, next: "APPROVED" | "REMOVED" | "ESCALATED") {
    if (!clubId) return;
    try {
      await api.patch(`/clubs/${clubId}/moderation/${id}`, { status: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.theModerationDecisionCouldNot"));
    }
  }

  return (
    <div>
      <PageHeader
        title={t("a.moderationQueue")}
        description={t("a.reviewReportedClubFeedPosts")}
        action={
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ModerationReport["status"])}
            className="w-44"
          >
            <option value="PENDING">{t("a.pending")}</option>
            <option value="APPROVED">{t("a.approved")}</option>
            <option value="REMOVED">{t("a.removed")}</option>
            <option value="ESCALATED">{t("a.escalated")}</option>
          </Select>
        }
      />
      <ErrorBanner message={error} />

      <Panel>
        {reports === null ? (
          <EmptyState message={t("a.loading2")} />
        ) : reports.length === 0 ? (
          <EmptyState message={status === "PENDING" ? t("a.nothingPendingReview") : t("a.noResolvedReports")} />
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
                          {t("a.reportedAt", { date: formatDate(report.createdAt, { dateStyle: "medium", timeStyle: "short" }) })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-drift-text-primary">
                        {report.post.body}
                      </p>
                      <p className="mt-3 text-sm text-drift-text-secondary">
                        <span className="font-semibold text-drift-text-primary">{t("a.reason")}</span> {report.reason}
                      </p>
                    </div>
                  </div>
                  {report.status === "PENDING" && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => void resolve(report.id, "APPROVED")}>
                        <MaterialIcon name="check" className="text-[18px]" />{t("a.approve")}</Button>
                      <Button variant="destructive" onClick={() => void resolve(report.id, "REMOVED")}>
                        <MaterialIcon name="delete" className="text-[18px]" />{t("a.remove")}</Button>
                      <Button variant="ghost" onClick={() => void resolve(report.id, "ESCALATED")}>
                        {t("a.escalate")}
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
