"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { OrganizationSummary } from "@/lib/organization-types";
import { Badge, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

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

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <PageHeader title="Organizations" description="Platform-level club and community records, ownership approvals, subscriptions, and moderation signals." />
      <ErrorBanner message={error} />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_180px]">
          <Input aria-label="Search organizations" placeholder="Search club name, address, or website..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select aria-label="Organization status" value={platformStatus} onChange={(event) => setPlatformStatus(event.target.value)}><option value="">Any status</option><option value="PENDING_REVIEW">Pending review</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></Select>
          <Select aria-label="Verification status" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="">Any verification</option><option value="UNVERIFIED">Unverified</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option></Select>
          <Select aria-label="Subscription status" value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value)}><option value="">Any subscription</option><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="CANCELLED">Cancelled</option></Select>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading organizations..." />}
      {rows?.length === 0 && <EmptyState message="No clubs match these filters." />}
      {rows && rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[1040px]">
            <thead><tr><Th>Club</Th><Th>Status</Th><Th>Subscription</Th><Th>Members</Th><Th>Courts</Th><Th>Approvals</Th><Th>Moderation</Th><Th className="text-right">Action</Th></tr></thead>
            <tbody>
              {rows.map((club) => (
                <tr key={club.id}>
                  <Td><div className="font-semibold">{club.name}</div><div className="max-w-xs truncate text-xs text-drift-text-secondary" title={club.address ?? undefined}>{club.address ?? "Address unknown"}</div></Td>
                  <Td><div className="flex flex-wrap gap-1.5"><Badge tone={statusTone(club.platformStatus)}>{label(club.platformStatus)}</Badge><Badge tone={statusTone(club.verificationStatus)}>{club.verificationStatus}</Badge></div>{club.platformStatusReason && <div className="mt-1 text-xs text-drift-text-secondary">{club.platformStatusReason}</div>}</Td>
                  <Td>{club.subscription ? <><Badge tone={statusTone(club.subscription.status)}>{label(club.subscription.status)}</Badge><div className="mt-1 text-xs text-drift-text-secondary">{club.subscription.plan.name} - {money(club.subscription.plan.priceMinor, club.subscription.plan.currency)}</div></> : <span className="text-sm text-drift-text-secondary">Not configured</span>}</Td>
                  <Td>{club.counts.members}</Td>
                  <Td>{club.counts.courts}</Td>
                  <Td>{club.counts.pendingAdminApprovals || "None"}</Td>
                  <Td>{club.counts.moderationReports}</Td>
                  <Td className="text-right"><Link href={`/organizations/${club.id}`} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Open club</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </Card>
      )}
    </div>
  );
}
