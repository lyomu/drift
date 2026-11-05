"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner } from "@/components/ui";
import { BackButton, SummaryStrip } from "@/components/redesign";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { SelectEditControl } from "@/components/EditFieldModal";
import { useToast } from "@/components/Toast";
import type { ClubRole, Member, MemberStats } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

const ROLES: ClubRole[] = [
  "OWNER",
  "ADMIN",
  "COMPETITION_MANAGER",
  "COACH",
  "CONTENT_MANAGER",
  "READ_ONLY",
];

type Tab = "overview" | "activity" | "access";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
};

function memberName(member: Member) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email;
}

function formatRole(role: string) {
  return role.replace(/_/g, " ");
}

export default function MemberDetailPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { notify } = useToast();
  const { userId } = useParams<{ userId: string }>();
  const { clubId, role: myRole } = useClub();
  const router = useRouter();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  // What this member did in the club, from the audit log (managers only: the
  // endpoint is restricted to them, so it is never requested for anyone else).
  const [activity, setActivity] = useState<AuditRow[] | null>(null);
  // Activity and engagement over the last 90 days (managers only, like the audit log).
  const [stats, setStats] = useState<MemberStats | null>(null);

  async function load() {
    if (!clubId) return;
    try {
      const response = await api.get<{ members: Member[] }>(
        `/clubs/${clubId}/members`,
      );
      setMembers(response.members);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : t("a.memberDetailsCouldNotBe"),
      );
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    if (!clubId || !canManage || !userId) return;
    let cancelled = false;
    api
      .get<{ logs: AuditRow[] }>(`/clubs/${clubId}/audit-log?actorId=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!cancelled) setActivity(res.logs);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, canManage, userId]);

  useEffect(() => {
    if (!clubId || !canManage || !userId) return;
    let cancelled = false;
    api
      .get<MemberStats>(`/clubs/${clubId}/members/${encodeURIComponent(userId)}/stats`)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => {
        // Stats are an extra: a failure leaves the profile as it was.
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, canManage, userId]);

  const member = useMemo(
    () => members?.find((item) => item.userId === userId) ?? null,
    [members, userId],
  );

  async function handleRoleChange(next: ClubRole) {
    if (!clubId || !member) return;
    setError(null);
    await api.patch(`/clubs/${clubId}/members/${member.membershipId}`, {
      role: next,
    });
    await load();
    notify(t("members.toastRole", { name: memberName(member) }));
  }

  async function handleRemove() {
    if (!clubId || !member) return;
    if (!window.confirm(t("mp.confirmRemove", { name: memberName(member) }))) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/clubs/${clubId}/members/${member.membershipId}`);
      notify(t("members.toastRemoved", { name: memberName(member) }));
      router.push("/members");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : t("a.theMemberCouldNotBe"),
      );
      setBusy(false);
    }
  }

  if (!members && !error) {
    return <EmptyState message={t("a.loading2")} />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t("mp.tabOverview") },
    ...(canManage
      ? [
          { id: "activity" as const, label: t("mp.tabActivity") },
          { id: "access" as const, label: t("mp.tabAccess") },
        ]
      : []),
  ];
  const isOwner = member?.role === "OWNER";

  return (
    <div>
      <div className="mb-5">
        <BackButton href="/members">{t("a.allMembers")}</BackButton>
      </div>
      <ErrorBanner message={error} />

      {!member ? (
        <EmptyState message={t("a.memberNotFound")} />
      ) : (
        <div className="flex flex-col">
          <section className="relative mb-[18px] overflow-hidden rounded-2xl border border-drift-border bg-drift-surface p-6 shadow-card">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-drift-primary-light/70 to-transparent" />
            <div className="relative flex flex-wrap items-center gap-5">
              <InitialsAvatar
                name={memberName(member)}
                tone="auto"
                size={72}
                className="border-4 border-drift-surface"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate font-display text-[clamp(22px,2.4vw,28px)] font-extrabold leading-tight text-drift-text-primary">
                    {memberName(member)}
                  </h1>
                  <StatusBadge status={member.status} />
                </div>
                <p className="mt-1 truncate text-[13px] text-drift-text-secondary">{member.email}</p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-semibold text-drift-text-secondary">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-drift-neutral-surface px-2.5 py-1">
                    <MaterialIcon name="shield_person" className="text-[14px]" />
                    {formatRole(member.role)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-drift-neutral-surface px-2.5 py-1">
                    <MaterialIcon name="calendar_month" className="text-[14px]" />
                    {t("mp.memberSince", { date: formatDate(member.joinedAt) })}
                  </span>
                </div>
              </div>
              {stats && (
                <div className="flex items-center gap-4 rounded-2xl border border-drift-border bg-drift-surface px-4 py-3">
                  <div
                    className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(var(--color-primary) ${stats.engagementScore}%, var(--color-neutral-surface) 0)`,
                    }}
                  >
                    <strong className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-drift-surface text-[20px] font-extrabold text-drift-text-primary tabular">
                      {stats.engagementScore}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-drift-text-secondary">
                      {t("mp.engagement")}
                    </span>
                    <strong className="mt-0.5 block text-[13px] font-extrabold text-drift-text-primary">
                      {t(`mp.band.${stats.engagementBand}` as const)}
                    </strong>
                    <small className="mt-0.5 block text-[11px] text-drift-text-secondary">
                      {t("mp.lastDays", { days: stats.windowDays })}
                    </small>
                  </div>
                </div>
              )}
            </div>
          </section>

          <SummaryStrip
            columns={4}
            items={[
              { icon: "badge", value: formatRole(member.role), label: t("a.role") },
              { icon: "verified_user", tone: "lime", value: formatRole(member.status), label: t("a.membership") },
              { icon: "calendar_month", tone: "gold", value: formatDate(member.joinedAt), label: t("a.joined") },
              stats
                ? {
                    icon: "sports_tennis",
                    tone: "violet",
                    value: `${stats.matchesWon}\u2013${stats.matchesLost}`,
                    label: t("mp.matchRecord"),
                  }
                : { icon: "fingerprint", tone: "violet", value: member.userId.slice(0, 8), label: t("mp.memberId") },
            ]}
          />

          {tabs.length > 1 && (
            <div
              role="tablist"
              aria-label={t("mp.tabsLabel")}
              className="mb-[18px] flex gap-1 border-b border-drift-border"
            >
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={`-mb-px border-b-2 px-4 py-3 text-[13px] font-bold transition-colors ${
                    tab === item.id
                      ? "border-drift-primary text-drift-primary-dark"
                      : "border-transparent text-drift-text-secondary hover:text-drift-text-primary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {tab === "overview" && (
            <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
              <ProfileCard title={t("mp.detailsTitle")} subtitle={t("mp.detailsHint")}>
                <dl className="divide-y divide-drift-border">
                  <DetailRow label={t("a.role")}>{formatRole(member.role)}</DetailRow>
                  <DetailRow label={t("a.membership")}>
                    <StatusBadge status={member.status} />
                  </DetailRow>
                  <DetailRow label={t("a.joined")}>{formatDate(member.joinedAt)}</DetailRow>
                  <DetailRow label={t("a.userId")}>
                    <span className="break-all font-mono text-[12px]">{member.userId}</span>
                  </DetailRow>
                </dl>
              </ProfileCard>
              {stats && (
                <ProfileCard
                  title={t("mp.statsTitle")}
                  subtitle={t("mp.statsHint", { days: stats.windowDays })}
                >
                  <dl className="divide-y divide-drift-border">
                    <DetailRow label={t("mp.matchesPlayed")}>
                      {t("mp.matchesDetail", { played: stats.matchesPlayed, won: stats.matchesWon })}
                    </DetailRow>
                    <DetailRow label={t("mp.eventsAttended")}>
                      {t("mp.eventsDetail", { attended: stats.eventsAttended, registered: stats.eventsRegistered })}
                    </DetailRow>
                    <DetailRow label={t("mp.posts")}>{stats.posts}</DetailRow>
                    <DetailRow label={t("mp.reactions")}>{stats.reactions}</DetailRow>
                    <DetailRow label={t("mp.activeLeagues")}>{stats.activeLeagues}</DetailRow>
                    <DetailRow label={t("mp.bookings")}>{stats.bookings}</DetailRow>
                    <DetailRow label={t("mp.hoursOnCourt")}>{t("mp.hoursValue", { hours: stats.hoursOnCourt })}</DetailRow>
                    <DetailRow label={t("mp.lastActive")}>
                      {stats.lastActiveAt ? formatDate(stats.lastActiveAt) : t("mp.never")}
                    </DetailRow>
                  </dl>
                </ProfileCard>
              )}
              {canManage && (
                <ProfileCard
                  title={t("mp.activityTitle")}
                  subtitle={t("mp.activityHint")}
                  action={
                    (activity?.length ?? 0) > 3 ? (
                      <button
                        type="button"
                        onClick={() => setTab("activity")}
                        className="text-[12px] font-bold text-drift-primary hover:text-drift-primary-dark"
                      >
                        {t("mp.seeAll")}
                      </button>
                    ) : undefined
                  }
                >
                  <ActivityList rows={(activity ?? []).slice(0, 3)} loaded={activity !== null} />
                </ProfileCard>
              )}
            </div>
          )}

          {tab === "activity" && canManage && (
            <ProfileCard title={t("mp.activityTitle")} subtitle={t("mp.activityHint")}>
              <ActivityList rows={activity ?? []} loaded={activity !== null} />
            </ProfileCard>
          )}

          {tab === "access" && canManage && (
            <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">
              <ProfileCard title={t("mp.accessTitle")} subtitle={t("mp.accessHint")}>
                <div className="flex flex-col gap-2 px-5 py-5">
                  <span className="text-[11px] font-bold text-drift-text-secondary">{t("a.role")}</span>
                  <div>
                    <SelectEditControl
                      value={member.role}
                      options={ROLES.map((r) => ({
                        value: r,
                        label: formatRole(r),
                      }))}
                      onSave={(next) => handleRoleChange(next as ClubRole)}
                      title={t("a.changeRole")}
                      description={`${memberName(member)} · ${member.email}`}
                      fieldLabel={t("a.role")}
                      confirmLabel={t("a.saveRole")}
                    />
                  </div>
                </div>
              </ProfileCard>
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-drift-error/25 bg-drift-error-surface/40 p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <IconChip icon={isOwner ? "shield" : "person_remove"} tone="error" />
                  <div className="min-w-0">
                    <h2 className="text-[14px] font-extrabold text-drift-text-primary">
                      {isOwner ? t("mp.ownerProtected") : t("a.removeMember")}
                    </h2>
                    <p className="mt-1 text-[12px] leading-[1.5] text-drift-text-secondary">
                      {isOwner ? t("mp.ownerProtectedHint") : t("mp.removeHint")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  disabled={busy || isOwner}
                  onClick={() => void handleRemove()}
                >
                  {busy ? t("a.removing") : isOwner ? t("mp.ownerProtected") : t("members.remove")}
                </Button>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-drift-border bg-drift-surface shadow-card">
      <div className="flex min-h-[68px] items-center justify-between gap-4 border-b border-drift-border px-5 py-3">
        <div>
          <h2 className="text-[14px] font-extrabold text-drift-text-primary">{title}</h2>
          {subtitle && <p className="mt-[3px] text-[11px] text-drift-text-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <dt className="text-[12px] font-semibold text-drift-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-bold text-drift-text-primary">{children}</dd>
    </div>
  );
}

function ActivityList({ rows, loaded }: { rows: AuditRow[]; loaded: boolean }) {
  const t = useT();
  const { formatDate } = useI18n();
  if (!loaded) return <EmptyState bare compact message={t("a.loading2")} />;
  if (rows.length === 0) {
    return <EmptyState bare compact icon="history" title={t("mp.activityEmpty")} />;
  }
  return (
    <ul className="divide-y divide-drift-border">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 px-5 py-3.5">
          <IconChip icon="history" tone="neutral" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold text-drift-text-primary">
              {row.action.replaceAll(".", " / ")}
            </div>
            <div className="mt-0.5 text-[11px] text-drift-text-secondary">{row.entityType}</div>
          </div>
          <time className="shrink-0 text-[11px] font-semibold text-drift-text-secondary">
            {formatDate(row.createdAt, { dateStyle: "medium", timeStyle: "short" })}
          </time>
        </li>
      ))}
    </ul>
  );
}
