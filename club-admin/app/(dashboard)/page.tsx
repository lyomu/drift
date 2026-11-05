"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { useWorkspace } from "@/lib/workspace-context";
import { Badge, Button, EmptyState, ErrorBanner } from "@/components/ui";
import { StatCard } from "@/components/redesign";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DateChip,
  MaterialIcon,
  SmallActionLink,
  TONE_CLASSES,
  type Tone,
} from "@/components/dashboard-design";
import type {
  Announcement,
  ClubEvent,
  ClubProfile,
  Dispute,
  LeagueSummary,
  Member,
} from "@/lib/types";
import { useI18n, useT, type Translate } from "@/lib/i18n/i18n-context";

type Engagement = {
  newMembers: number;
  posts: number;
  reactions: number;
  eventRegistrations: number;
  competitionRegistrations: number;
};
type Utilisation = { requested: number; approved: number; hoursBooked: number; utilisationPct: number | null };

function displayName(member: Member) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email;
}

function playerName(player: Dispute["sideA"], t: Translate) {
  if (!player) return t("a.player");
  return `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || t("a.player");
}

function greeting(t: Translate) {
  const hour = new Date().getHours();
  if (hour < 12) return t("a.goodMorning");
  if (hour < 17) return t("a.goodAfternoon");
  return t("a.goodEvening");
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Full class names, not built at runtime, so Tailwind can see and emit them.
const BAR_CLASSES: Record<"primary" | "forest" | "coral" | "gold" | "violet", string> = {
  primary: "bg-drift-primary",
  forest: "bg-drift-forest",
  coral: "bg-drift-coral",
  gold: "bg-drift-gold",
  violet: "bg-drift-violet",
};

export default function OverviewPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { clubId, clubName, role } = useClub();
  const { user } = useWorkspace();
  const firstName = user?.firstName?.trim() || null;
  const canManage = role === "OWNER" || role === "ADMIN";
  const [club, setClub] = useState<ClubProfile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [usage, setUsage] = useState<Utilisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const inSixtyDays = new Date(now.getTime() + 60 * DAY_MS);
        const range = new URLSearchParams({
          from: new Date(now.getTime() - 30 * DAY_MS).toISOString(),
          to: now.toISOString(),
        }).toString();
        const [
          clubRes,
          membersRes,
          leaguesRes,
          disputesRes,
          eventsRes,
          announcementsRes,
          engagementRes,
          courtsRes,
        ] = await Promise.all([
          api.get<ClubProfile>(`/clubs/${clubId}`),
          api.get<{ members: Member[] }>(`/clubs/${clubId}/members`),
          api.get<{ leagues: LeagueSummary[] }>(`/clubs/${clubId}/leagues`),
          api.get<{ disputes: Dispute[] }>(`/clubs/${clubId}/disputes`),
          api.get<{ events: ClubEvent[] }>(
            `/clubs/${clubId}/events?from=${now.toISOString()}&to=${inSixtyDays.toISOString()}`,
          ),
          api.get<{ announcements: Announcement[] }>(
            `/clubs/${clubId}/announcements`,
          ),
          // Analytics are a bonus on this page: a role that cannot read them
          // just loses those two cards instead of the whole dashboard.
          api
            .get<{ metrics: Engagement }>(`/clubs/${clubId}/analytics/engagement?${range}`)
            .catch(() => null),
          api
            .get<{ utilisation: Utilisation }>(`/clubs/${clubId}/analytics/courts?${range}`)
            .catch(() => null),
        ]);
        if (cancelled) return;
        setClub(clubRes);
        setMembers(membersRes.members);
        setLeagues(leaguesRes.leagues);
        setDisputes(disputesRes.disputes);
        setEvents(eventsRes.events);
        setAnnouncements(announcementsRes.announcements);
        setEngagement(engagementRes?.metrics ?? null);
        setUsage(courtsRes?.utilisation ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : t("a.dashboardDataCouldNotBe"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId, t]);

  const activeMembers = members.filter((member) => member.status === "ACTIVE");
  const pendingMembers = members.filter((member) => member.status === "PENDING");
  const activeLeagues = leagues.filter(
    (league) =>
      league.competitionState === "ACTIVE" ||
      league.competitionState === "REGISTRATION_OPEN" ||
      league.competitionState === "SCHEDULED",
  );
  const playersCompeting = activeLeagues.reduce((sum, league) => sum + (league.enrolledCount ?? 0), 0);
  const nextEvent = events[0] ?? null;

  const comingUp = useMemo(
    () =>
      events.slice(0, 3).map((event) => ({
        id: event.id,
        href: `/events/${event.id}`,
        date: new Date(event.startsAt),
        title: event.name,
        detail: t("ov.registered", {
          count: `${event._count?.registrations ?? 0}${event.capacity ? `/${event.capacity}` : ""}`,
        }),
        status: event.status,
      })),
    [events, t],
  );

  const recentActivity = useMemo(() => {
    const items: { id: string; icon: string; tone: Tone; text: string; time: string }[] = [
      ...members.slice(0, 2).map((member) => ({
        id: `member-${member.membershipId}`,
        icon: "person_add",
        tone: "success" as const,
        text: t("ov.memberJoined", { name: displayName(member) }),
        time: formatDate(member.joinedAt),
      })),
      ...announcements.slice(0, 2).map((announcement) => ({
        id: `announcement-${announcement.id}`,
        icon: "campaign",
        tone: "info" as const,
        text: t("ov.announcementUpdated", { title: announcement.title }),
        time: formatDate(announcement.updatedAt),
      })),
    ];
    return items.slice(0, 4);
  }, [announcements, members, t, formatDate]);

  const attentionCount = disputes.length + (canManage ? pendingMembers.length : 0);

  const engagementRows = engagement
    ? [
        { label: t("ov.engNewMembers"), value: engagement.newMembers, tone: "primary" as const },
        { label: t("ov.engPosts"), value: engagement.posts, tone: "forest" as const },
        { label: t("ov.engReactions"), value: engagement.reactions, tone: "coral" as const },
        { label: t("ov.engEventSignups"), value: engagement.eventRegistrations, tone: "gold" as const },
        { label: t("ov.engCompetitionSignups"), value: engagement.competitionRegistrations, tone: "violet" as const },
      ]
    : [];
  const engagementMax = Math.max(1, ...engagementRows.map((row) => row.value));
  const engagementTotal = engagementRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-drift-text-secondary">
            <span className="h-[7px] w-[7px] rounded-full bg-drift-primary shadow-[0_0_0_4px_var(--color-primary-light)]" />
            {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="font-display text-[clamp(27px,2.3vw,36px)] font-extrabold leading-[1.1] text-drift-text-primary">
            {firstName ? `${greeting(t)}, ${firstName}.` : `${greeting(t)}.`}
          </h1>
          <p className="mt-[7px] text-[13px] text-drift-text-secondary">
            {t("ov.subtitle", { club: clubName ?? t("a.clubDashboard") })}
          </p>
        </div>
        <Link href="/events/new">
          <Button>
            <MaterialIcon name="add" className="text-[19px]" />
            {t("a.createEvent")}
          </Button>
        </Link>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message={t("a.loading2")} />
      ) : (
        <>
          {club?.verificationStatus === "UNVERIFIED" && (
            <div className="mb-[18px] flex flex-wrap items-center gap-3.5 rounded-[14px] border border-drift-warning/20 bg-drift-warning-surface px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-drift-surface">
                <MaterialIcon name="verified" className="text-[21px] text-drift-warning" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-drift-text-primary">{t("a.yourClubIsNotVerified")}</div>
                <div className="text-[12px] text-drift-text-secondary">{t("a.verificationAddsABadgeTo")}</div>
              </div>
              <Link href="/settings">
                <Button className="bg-drift-warning hover:bg-drift-warning">{t("a.verifyNow")}</Button>
              </Link>
            </div>
          )}

          <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              href="/members"
              hrefLabel={t("a.members")}
              icon="groups"
              label={t("ov.activeMembers")}
              value={activeMembers.length}
              hint={t("ov.membersTotal", { count: members.length })}
            />
            <StatCard
              href="/leagues"
              hrefLabel={t("a.activeLeagues")}
              icon="emoji_events"
              tone="lime"
              label={t("a.activeLeagues")}
              value={activeLeagues.length}
              hint={t("ov.playersCompeting", { count: playersCompeting })}
            />
            {usage !== null && (
              <StatCard
                href="/reports"
                hrefLabel={t("ov.courtUsage")}
                icon="sports_tennis"
                tone="gold"
                label={t("ov.courtUsage")}
                value={usage.utilisationPct === null ? "–" : `${usage.utilisationPct}%`}
                hint={
                  usage.utilisationPct === null
                    ? t("ov.courtUsageNoHours")
                    : t("ov.courtUsageHint", { hours: usage.hoursBooked })
                }
              />
            )}
            <StatCard
              href={nextEvent ? `/events/${nextEvent.id}` : "/events"}
              hrefLabel={t("ov.nextEvent")}
              icon="event"
              tone="coral"
              label={t("ov.nextEvent")}
              compactValue
              value={nextEvent ? nextEvent.name : t("ov.noNextEvent")}
              hint={
                nextEvent
                  ? formatDate(nextEvent.startsAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : undefined
              }
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.85fr)]">
            <div className="grid min-w-0 gap-[18px]">
              <CardShell
                title={t("a.needsYourAttention")}
                action={
                  attentionCount > 0 ? (
                    <span className="rounded-full bg-drift-coral-surface px-2 py-[5px] text-[11px] font-bold text-drift-coral">
                      {t("ov.attentionCount", { count: attentionCount })}
                    </span>
                  ) : (
                    <SmallActionLink href="/disputes">{t("a.viewDisputes")}</SmallActionLink>
                  )
                }
              >
                <div className="px-2.5 pb-2.5 pt-[7px]">
                  {attentionCount === 0 && (
                    <div className="m-2 flex items-center gap-2.5 rounded-[10px] bg-drift-surface-sunken px-3 py-4 text-[13px] text-drift-text-secondary">
                      <MaterialIcon name="task_alt" className="text-[20px] text-drift-success" />
                      {t("ov.allClear")}
                    </div>
                  )}
                  {disputes.slice(0, 3).map((dispute) => (
                    <AttentionRow
                      key={dispute.fixtureId}
                      href="/disputes"
                      icon="gavel"
                      tone="coral"
                      title={t("a.disputedScoreBetween", {
                        first: playerName(dispute.sideA, t),
                        second: playerName(dispute.sideB, t),
                      })}
                      detail={t("a.fixtureAwaitingAdminRuling")}
                      action={t("a.review")}
                    />
                  ))}
                  {canManage &&
                    pendingMembers.slice(0, 3).map((member) => (
                      <AttentionRow
                        key={member.membershipId}
                        href="/members"
                        icon="person_add"
                        tone="primary"
                        title={t("ov.joinRequestTitle")}
                        detail={t("ov.joinRequestDetail", { name: displayName(member) })}
                        action={t("a.review")}
                      />
                    ))}
                </div>
              </CardShell>

              <CardShell
                title={t("ov.clubActivity")}
                action={
                  <SmallActionLink href="/reports">
                    {t("ov.viewReport")}
                    <MaterialIcon name="chevron_right" className="text-[16px]" />
                  </SmallActionLink>
                }
              >
                <div className="px-[19px] pb-5 pt-4">
                  {engagement === null ? (
                    <p className="py-6 text-center text-[12px] text-drift-text-secondary">{t("ov.activityUnavailable")}</p>
                  ) : (
                    <>
                      <div className="mb-4 flex items-end gap-3">
                        <div>
                          <span className="block text-[11px] font-semibold text-drift-text-secondary">
                            {t("ov.last30Days")}
                          </span>
                          <strong className="text-[28px] font-extrabold leading-tight text-drift-text-primary tabular">
                            {engagementTotal}
                          </strong>
                        </div>
                      </div>
                      <ul className="flex flex-col gap-3.5">
                        {engagementRows.map((row) => (
                          <li key={row.label}>
                            <div className="mb-1.5 flex items-center justify-between text-[12px]">
                              <span className="font-semibold text-drift-text-primary">{row.label}</span>
                              <span className="font-bold text-drift-text-primary tabular">{row.value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-drift-neutral-surface">
                              <div
                                className={`h-full rounded-full ${BAR_CLASSES[row.tone]}`}
                                style={{ width: `${Math.max(row.value > 0 ? 4 : 0, (row.value / engagementMax) * 100)}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </CardShell>
            </div>

            <div className="grid min-w-0 gap-[18px]">
              <CardShell title={t("a.quickActions")}>
                <div className="grid grid-cols-2 gap-[9px] p-3">
                  <QuickAction href="/members" icon="person_add" label={t("a.inviteMember")} />
                  <QuickAction href="/announcements" icon="campaign" label={t("a.newAnnouncement")} />
                  <QuickAction href="/courts/new" icon="sports_tennis" label={t("ov.addCourt")} />
                  <QuickAction href="/leagues" icon="emoji_events" label={t("ov.newLeague")} />
                </div>
              </CardShell>

              <CardShell
                title={t("a.comingUp")}
                action={
                  <SmallActionLink href="/events">
                    {t("a.viewCalendar")}
                    <MaterialIcon name="chevron_right" className="text-[16px]" />
                  </SmallActionLink>
                }
              >
                <div className="px-[19px] py-1.5">
                  {comingUp.length === 0 ? (
                    <div className="py-5 text-[13px] text-drift-text-secondary">{t("a.noEventsScheduled")}</div>
                  ) : (
                    comingUp.map((item, index) => (
                      <Link
                        href={item.href}
                        key={item.id}
                        className={`flex items-center gap-3 py-3 ${
                          index < comingUp.length - 1 ? "border-b border-drift-border" : ""
                        }`}
                      >
                        <DateChip value={item.date} tone={index === 0 ? "lime" : "primary"} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold text-drift-text-primary">{item.title}</div>
                          <div className="mt-0.5 text-[11px] text-drift-text-secondary">{item.detail}</div>
                        </div>
                        <StatusBadge status={item.status} />
                      </Link>
                    ))
                  )}
                </div>
              </CardShell>

              <CardShell title={t("a.recentActivity")}>
                <div className="flex flex-col gap-3 px-[19px] py-4">
                  {recentActivity.length === 0 ? (
                    <p className="text-[13px] text-drift-text-secondary">{t("a.activityWillAppearAsMembers")}</p>
                  ) : (
                    recentActivity.map((item) => (
                      <div key={item.id} className="flex items-start gap-2.5">
                        <span
                          className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[item.tone]}`}
                        >
                          <MaterialIcon name={item.icon} className="text-[16px]" />
                        </span>
                        <p className="pt-1 text-[12px] leading-snug text-drift-text-primary">
                          {item.text}{" "}
                          <small className="block text-[11px] text-drift-text-secondary">{item.time}</small>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardShell>
            </div>
          </div>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-drift-border pt-4 text-[11px] text-drift-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <MaterialIcon name="verified_user" className="text-[16px]" />
              {t("a.verification")}
              {club ? <StatusBadge status={club.verificationStatus} /> : <Badge>{t("a.unknown")}</Badge>}
            </span>
          </footer>
        </>
      )}
    </div>
  );
}

/** The design's overview card: rounded, shadowed, with a 60px title row. */
function CardShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-drift-border bg-drift-surface shadow-card">
      <div className="flex min-h-[60px] items-center justify-between gap-4 border-b border-drift-border px-[19px]">
        <h2 className="text-[13px] font-extrabold text-drift-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AttentionRow({
  href,
  icon,
  tone,
  title,
  detail,
  action,
}: {
  href: string;
  icon: string;
  tone: Tone;
  title: string;
  detail: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-drift-border px-[9px] py-[11px] last:border-b-0 hover:rounded-[10px] hover:bg-drift-surface-sunken"
    >
      <span
        className={`flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-[10px] ${TONE_CLASSES[tone]}`}
      >
        <MaterialIcon name={icon} className="text-[19px]" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[13px] font-bold text-drift-text-primary">{title}</strong>
        <small className="mt-0.5 block truncate text-[11px] text-drift-text-secondary">{detail}</small>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-bold text-drift-primary">
        {action}
        <MaterialIcon name="chevron_right" className="text-[16px]" />
      </span>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-2 rounded-xl border border-drift-border bg-drift-surface p-3.5 transition-all hover:-translate-y-px hover:border-drift-primary hover:bg-drift-primary-light"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-drift-primary-light text-drift-primary group-hover:bg-drift-surface">
        <MaterialIcon name={icon} className="text-[19px]" />
      </span>
      <span className="text-[12px] font-bold text-drift-text-primary">{label}</span>
    </Link>
  );
}
