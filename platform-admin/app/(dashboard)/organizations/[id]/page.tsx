"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { OrganizationDetail, VerificationStatus } from "@/lib/organization-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Th, Textarea, statusTone } from "@/components/ui";

function label(value: string) {
  return value.replaceAll("_", " ");
}

function nameOf(person: { firstName: string | null; lastName: string | null; email: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
}

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const [club, setClub] = useState<OrganizationDetail | null>(null);
  const [form, setForm] = useState({ name: "", description: "", address: "", phone: "", website: "", verificationStatus: "UNVERIFIED" as VerificationStatus });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<{ club: OrganizationDetail }>(`/organizations/${params.id}`);
      setClub(response.club);
      setForm({
        name: response.club.name,
        description: response.club.description ?? "",
        address: response.club.address ?? "",
        phone: response.club.phone ?? "",
        website: response.club.website ?? "",
        verificationStatus: response.club.verificationStatus,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The club could not be loaded.");
    }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await api.patch(`/organizations/${params.id}/profile`, {
        name: form.name,
        description: form.description || null,
        address: form.address || null,
        phone: form.phone || null,
        website: form.website || null,
        verificationStatus: form.verificationStatus,
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The club profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "ACTIVE" | "SUSPENDED") {
    if (!club) return;
    const reason = status === "SUSPENDED" ? window.prompt(`Reason for suspending ${club.name}`) : window.prompt(`Reason for approving/restoring ${club.name}`, "Platform review complete");
    if (reason === null) return;
    if (status === "SUSPENDED" && !reason.trim()) {
      setError("A suspension reason is required.");
      return;
    }
    const verb = status === "SUSPENDED" ? "suspend" : club.platformStatus === "PENDING_REVIEW" ? "approve" : "restore";
    if (!window.confirm(`Confirm that you want to ${verb} ${club.name}.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/organizations/${params.id}/status`, { status, reason: reason.trim() || undefined });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The organization status could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={club?.name ?? "Club detail"}
        description="Platform-level organization record, ownership approvals, billing state, and community oversight."
        action={<Link href="/organizations" className="text-sm font-semibold text-drift-primary hover:underline">Back to organizations</Link>}
      />
      <ErrorBanner message={error} />
      {saved && <div className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm text-drift-success">Club profile saved.</div>}

      {!club && !error && <EmptyState message="Loading club detail..." />}
      {club && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-drift-border bg-drift-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(club.platformStatus)}>{label(club.platformStatus)}</Badge>
              <Badge tone={statusTone(club.verificationStatus)}>{club.verificationStatus}</Badge>
              {club.platformStatusReason && <span className="text-sm text-drift-text-secondary">{club.platformStatusReason}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {club.platformStatus !== "ACTIVE" && <Button disabled={busy} onClick={() => void setStatus("ACTIVE")}>{club.platformStatus === "PENDING_REVIEW" ? "Approve club" : "Restore club"}</Button>}
              {club.platformStatus !== "SUSPENDED" && <Button variant="destructive" disabled={busy} onClick={() => void setStatus("SUSPENDED")}>Suspend club</Button>}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card>
              <h2 className="mb-4 font-display text-xl font-semibold text-drift-text-primary">Platform record</h2>
              <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
                <Field label="Club name"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
                <Field label="Verification"><Select value={form.verificationStatus} onChange={(event) => setForm((current) => ({ ...current, verificationStatus: event.target.value as VerificationStatus }))}><option value="UNVERIFIED">Unverified</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option></Select></Field>
                <Field label="Address"><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
                <Field label="Website"><Input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} /></Field>
                <div className="md:col-span-2"><Field label="Description"><Textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field></div>
                <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save profile"}</Button></div>
              </form>
            </Card>

            <Card>
              <h2 className="mb-4 font-display text-xl font-semibold text-drift-text-primary">Subscription</h2>
              {club.billing.subscription ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Status</span><Badge tone={statusTone(club.billing.subscription.status)}>{label(club.billing.subscription.status)}</Badge></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Plan</span><span className="font-semibold">{club.billing.subscription.plan.name}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Price</span><span>{money(club.billing.subscription.plan.priceMinor, club.billing.subscription.plan.currency)} / {club.billing.subscription.plan.interval.toLowerCase()}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-drift-text-secondary">Renewal</span><span>{new Date(club.billing.subscription.currentPeriodEnd).toLocaleDateString()}</span></div>
                </div>
              ) : <EmptyState message="No club subscription is configured." />}
              <div className="mt-4"><Link href={`/organizations/subscriptions?clubId=${club.id}`} className="font-semibold text-drift-primary hover:underline">View subscription status</Link></div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4"><div className="text-2xl font-bold text-drift-text-primary">{club.counts.members}</div><div className="text-sm text-drift-text-secondary">Members</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold text-drift-text-primary">{club.counts.courts}</div><div className="text-sm text-drift-text-secondary">Courts</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold text-drift-text-primary">{club.counts.leagues + club.counts.tournaments + club.counts.ladders}</div><div className="text-sm text-drift-text-secondary">Competitions</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold text-drift-text-primary">{club.moderationByStatus.ESCALATED ?? 0}</div><div className="text-sm text-drift-text-secondary">Escalated reports</div></Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="overflow-x-auto p-0">
              <div className="flex items-center justify-between gap-3 px-6 py-4"><h2 className="font-display text-xl font-semibold text-drift-text-primary">Members and admins</h2><Link href={`/organizations/approvals?clubId=${club.id}`} className="text-sm font-semibold text-drift-primary hover:underline">Approvals</Link></div>
              {club.memberships.length === 0 ? <div className="px-6 pb-6"><EmptyState message="No members are attached to this club." /></div> : (
                <table className="w-full min-w-[640px]">
                  <thead><tr><Th>Person</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th></tr></thead>
                  <tbody>{club.memberships.map((member) => <tr key={member.membershipId}><Td>{nameOf(member)}</Td><Td>{label(member.role)}</Td><Td><Badge tone={statusTone(member.status)}>{member.status}</Badge></Td><Td>{new Date(member.createdAt).toLocaleDateString()}</Td></tr>)}</tbody>
                </table>
              )}
            </Card>

            <Card className="overflow-x-auto p-0">
              <div className="flex items-center justify-between gap-3 px-6 py-4"><h2 className="font-display text-xl font-semibold text-drift-text-primary">Linked courts</h2><Link href={`/venues?clubId=${club.id}`} className="text-sm font-semibold text-drift-primary hover:underline">Venue database</Link></div>
              {club.courts.length === 0 ? <div className="px-6 pb-6"><EmptyState message="No venues are linked to this club." /></div> : (
                <table className="w-full min-w-[560px]">
                  <thead><tr><Th>Court</Th><Th>Verification</Th><Th className="text-right">Action</Th></tr></thead>
                  <tbody>{club.courts.map((court) => <tr key={court.id}><Td><div className="font-semibold">{court.name}</div><div className="text-xs text-drift-text-secondary">{court.address ?? "Address unknown"}</div></Td><Td><Badge tone={statusTone(court.verificationStatus)}>{court.verificationStatus}</Badge></Td><Td className="text-right"><Link href={`/venues/${court.id}`} className="font-semibold text-drift-primary hover:underline">Open venue</Link></Td></tr>)}</tbody>
                </table>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-drift-text-primary">Community moderation</h2>
                <p className="mt-1 text-sm text-drift-text-secondary">{club.counts.moderationReports} total reports across this club feed.</p>
              </div>
              <Link href={`/organizations/moderation?clubId=${club.id}`} className="font-semibold text-drift-primary hover:underline">Review escalations</Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
