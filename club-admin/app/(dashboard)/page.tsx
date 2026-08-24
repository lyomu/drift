"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Card, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { ClubProfile, LeagueSummary, Member, Dispute } from "@/lib/types";

export default function OverviewPage() {
  const { clubId, clubName } = useClub();
  const [club, setClub] = useState<ClubProfile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const [clubRes, membersRes, leaguesRes, disputesRes] = await Promise.all([
        api.get<ClubProfile>(`/clubs/${clubId}`),
        api.get<{ members: Member[] }>(`/clubs/${clubId}/members`),
        api.get<{ leagues: LeagueSummary[] }>(`/clubs/${clubId}/leagues`),
        api.get<{ disputes: Dispute[] }>(`/clubs/${clubId}/disputes`),
      ]);
      if (cancelled) return;
      setClub(clubRes);
      setMembers(membersRes.members);
      setLeagues(leaguesRes.leagues);
      setDisputes(disputesRes.disputes);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  return (
    <div>
      <PageHeader
        title={clubName ?? "Overview"}
        description="A snapshot of your club."
      />
      {loading ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Members" value={members.length} href="/members" />
          <StatCard label="Leagues" value={leagues.length} href="/leagues" />
          <StatCard
            label="Open disputes"
            value={disputes.length}
            href="/disputes"
          />
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-drift-text-secondary">
              Verification
            </div>
            <div className="mt-2">
              {club && <StatusBadge status={club.verificationStatus} />}
            </div>
            <Link
              href="/settings"
              className="mt-3 inline-block text-sm font-semibold text-drift-primary"
            >
              Manage in Settings →
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-drift-primary">
        <div className="text-xs font-semibold uppercase tracking-wide text-drift-text-secondary">
          {label}
        </div>
        <div className="mt-2 font-display text-3xl font-bold text-drift-text-primary">
          {value}
        </div>
      </Card>
    </Link>
  );
}
