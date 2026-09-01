"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { OrganizationSummary } from "@/lib/organization-types";
import { DataTable } from "@/components/DataTable";
import { Badge, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, plural, Select, statusTone } from "@/components/ui";

function label(value: string) {
  return value.replaceAll("_", " ");
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
}

export default function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const [platformStatus, setPlatformStatus] = useState("");
  const [verification, setVerification] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [rows, setRows] = useState<OrganizationSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ take: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (platformStatus) params.set("platformStatus", platformStatus);
      if (verification) params.set("verification", verification);
      if (subscriptionStatus) params.set("subscriptionStatus", subscriptionStatus);
      const response = await api.get<{ total: number; clubs: OrganizationSummary[] }>(`/organizations?${params.toString()}`);
      setRows(response.clubs);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Organizations could not be loaded.");
    }
  }, [platformStatus, search, subscriptionStatus, verification]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => ({
    active: rows?.filter((club) => club.platformStatus === "ACTIVE").length ?? 0,
    pending: rows?.filter((club) => club.platformStatus === "PENDING_REVIEW").length ?? 0,
    approvals: rows?.reduce((sum, club) => sum + club.counts.pendingAdminApprovals, 0) ?? 0,
    moderation: rows?.reduce((sum, club) => sum + club.counts.moderationReports, 0) ?? 0,
  }), [rows]);

  return (
    <div>
      <PageHeader title="Organizations" description="Platform-level club and community records, ownership approvals, subscriptions, and moderation signals." />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Active clubs", value: counts.active, icon: "corporate_fare", tone: "green" },
          { label: "Pending review", value: counts.pending, icon: "rate_review", tone: "amber" },
          { label: "Approvals", value: counts.approvals, icon: "approval", tone: "blue" },
          { label: "Moderation", value: counts.moderation, icon: "forum", tone: counts.moderation ? "red" : "gray" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_180px]">
          <Field label="Search"><Input aria-label="Search organizations" placeholder="Search club name, address, or website..." value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
          <Field label="Status"><Select aria-label="Organization status" value={platformStatus} onChange={(event) => setPlatformStatus(event.target.value)}><option value="">Any status</option><option value="PENDING_REVIEW">Pending review</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></Select></Field>
          <Field label="Verification"><Select aria-label="Verification status" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="">Any verification</option><option value="UNVERIFIED">Unverified</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option></Select></Field>
          <Field label="Subscription"><Select aria-label="Subscription status" value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value)}><option value="">Any subscription</option><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="CANCELLED">Cancelled</option></Select></Field>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading organizations..." />}
      {rows?.length === 0 && <EmptyState message="No clubs match these filters." />}
      {rows && rows.length > 0 && (
        <div>
          <DataTable
            rows={rows}
            rowKey={(club) => club.id}
            columns={[
              {
                header: "Organization",
                cell: (club) => (
                  <div className="min-w-0">
                    <Link href={`/organizations/${club.id}`} className="font-bold text-drift-primary hover:underline">
                      {club.name}
                    </Link>
                    <div className="truncate text-xs text-drift-text-secondary" title={club.address ?? undefined}>
                      {club.address ?? "Address unknown"}
                    </div>
                  </div>
                ),
              },
              {
                header: "Status",
                cell: (club) => (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={statusTone(club.platformStatus)}>{label(club.platformStatus)}</Badge>
                    <Badge tone={statusTone(club.verificationStatus)}>{club.verificationStatus}</Badge>
                  </div>
                ),
              },
              {
                header: "Directory",
                cell: (club) => (
                  <div>
                    <span className="font-bold tabular">{club.counts.members}</span> {plural(club.counts.members, "member")}
                    <div className="text-xs font-semibold text-drift-text-secondary">
                      {club.counts.courts} {plural(club.counts.courts, "court")}
                    </div>
                  </div>
                ),
              },
              {
                header: "Subscription",
                cell: (club) =>
                  club.subscription ? (
                    <div>
                      <Badge tone={statusTone(club.subscription.status)}>{label(club.subscription.status)}</Badge>
                      <div className="mt-1 text-xs text-drift-text-secondary">
                        {club.subscription.plan.name} / {money(club.subscription.plan.priceMinor, club.subscription.plan.currency)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-drift-text-secondary">Not configured</span>
                  ),
              },
              {
                header: "Signals",
                cell: (club) => (
                  <div className="text-xs font-semibold text-drift-text-secondary">
                    <div>{club.counts.pendingAdminApprovals} approvals</div>
                    <div>{club.counts.moderationReports} moderation reports</div>
                  </div>
                ),
              },
              {
                header: "Action",
                className: "text-right",
                cell: (club) => (
                  <Link href={`/organizations/${club.id}`} className="font-bold text-drift-primary hover:underline">
                    Open
                  </Link>
                ),
              },
            ]}
          />
          <div className="px-1 text-xs font-semibold text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </div>
      )}
    </div>
  );
}
