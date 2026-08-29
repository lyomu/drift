"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { OrganizationSummary } from "@/lib/organization-types";
import { Badge, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";

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
        <div className="grid gap-3">
          {rows.map((club) => (
            <RowCard key={club.id}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_1fr_160px_180px_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="font-bold text-drift-text-primary">{club.name}</div>
                  <div className="truncate text-xs text-drift-text-secondary" title={club.address ?? undefined}>{club.address ?? "Address unknown"}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={statusTone(club.platformStatus)}>{label(club.platformStatus)}</Badge>
                  <Badge tone={statusTone(club.verificationStatus)}>{club.verificationStatus}</Badge>
                </div>
                <div className="text-sm">
                  <span className="font-bold tabular">{club.counts.members}</span> members
                  <div className="text-xs font-semibold text-drift-text-secondary">{club.counts.courts} courts</div>
                </div>
                <div className="text-sm text-drift-text-primary">
                  {club.subscription ? <><Badge tone={statusTone(club.subscription.status)}>{label(club.subscription.status)}</Badge><div className="mt-1 text-xs text-drift-text-secondary">{club.subscription.plan.name} / {money(club.subscription.plan.priceMinor, club.subscription.plan.currency)}</div></> : <span className="text-drift-text-secondary">Not configured</span>}
                </div>
                <Link href={`/organizations/${club.id}`} className="justify-self-start font-bold text-drift-primary hover:underline lg:justify-self-end">Open club</Link>
              </div>
              {(club.counts.pendingAdminApprovals > 0 || club.counts.moderationReports > 0) && (
                <div className="mt-3 flex gap-2 text-xs font-semibold text-drift-text-secondary">
                  <span>{club.counts.pendingAdminApprovals} approvals</span>
                  <span>/</span>
                  <span>{club.counts.moderationReports} moderation reports</span>
                </div>
              )}
            </RowCard>
          ))}
          <div className="px-1 text-xs font-semibold text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </div>
      )}
    </div>
  );
}
