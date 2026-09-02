"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Badge, Button, EmptyState, ErrorBanner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DateChip,
  HeaderIconButton,
  IconChip,
  InitialsAvatar,
  MaterialIcon,
  Panel,
  SectionTitle,
  SmallActionLink,
} from "@/components/dashboard-design";
import type {
  Announcement,
  ClubEvent,
  ClubProfile,
  Dispute,
  LeagueSummary,
  Member,
} from "@/lib/types";

function displayName(member: Member) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email;
}

function playerName(player: Dispute["sideA"]) {
  if (!player) return "Player";
  return `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Player";
}

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const { clubId, clubName } = useClub();
  const [club, setClub] = useState<ClubProfile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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
        const inSixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        const [
          clubRes,
          membersRes,
          leaguesRes,
          disputesRes,
          eventsRes,
          announcementsRes,
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
        ]);
        if (cancelled) return;
        setClub(clubRes);
        setMembers(membersRes.members);
        setLeagues(leaguesRes.leagues);
        setDisputes(disputesRes.disputes);
        setEvents(eventsRes.events);
        setAnnouncements(announcementsRes.announcements);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Dashboard data could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const activeMembers = members.filter((member) => member.status === "ACTIVE");
  const activeLeagues = leagues.filter(
    (league) =>
      league.competitionState === "ACTIVE" ||
      league.competitionState === "REGISTRATION_OPEN" ||
      league.competitionState === "SCHEDULED",
  );
  const nextEvent = events[0] ?? null;

  const comingUp = useMemo(
    () =>
      events
        .slice(0, 3)
        .map((event) => ({
          id: event.id,
          href: `/events/${event.id}`,
          date: new Date(event.startsAt),
          title: event.name,
          detail: `${event._count?.registrations ?? 0}${
            event.capacity ? `/${event.capacity}` : ""
          } registered`,
          status: event.status,
        })),
    [events],
  );

  const recentActivity = useMemo(() => {
    const items = [
      ...members.slice(0, 2).map((member) => ({
        id: `member-${member.membershipId}`,
        icon: "person_add",
        tone: "success" as const,
        text: `${displayName(member)} joined the club`,
        time: new Date(member.joinedAt).toLocaleDateString(),
      })),
      ...announcements.slice(0, 2).map((announcement) => ({
        id: `announcement-${announcement.id}`,
        icon: "campaign",
        tone: "info" as const,
        text: `Announcement "${announcement.title}" ${announcement.status.toLowerCase()}`,
        time: new Date(announcement.updatedAt).toLocaleDateString(),
      })),
    ];
    return items.slice(0, 4);
  }, [announcements, members]);

  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-[34px] text-drift-text-primary">
            {greeting()}, {activeMembers[0]?.firstName ?? "Admin"}
          </h1>
          <p className="mt-1 text-sm text-drift-text-secondary">
            {formatDate(new Date())} / {clubName ?? "Club dashboard"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <HeaderIconButton icon="search" href="/members" label="Search" />
          <HeaderIconButton
            icon="notifications"
            href="/notifications"
            dot={disputes.length > 0}
            label="Notifications"
          />
          <InitialsAvatar
            name={activeMembers[0] ? displayName(activeMembers[0]) : clubName ?? "Drift"}
            className="bg-drift-primary-dark text-white"
          />
        </div>
      </div>

      <div className="mt-6">
        <ErrorBanner message={error} />
      </div>

      {loading ? (
        <EmptyState message="Loading..." />
      ) : (
        <>
          {club?.verificationStatus === "UNVERIFIED" && (
            <div className="mb-6 flex items-center gap-3.5 rounded-lg border border-drift-warning/20 bg-drift-warning-surface px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white">
                <MaterialIcon name="verified" className="text-[21px] text-drift-warning" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-drift-text-primary">
                  Your club is not verified yet
                </div>
                <div className="text-[13px] text-drift-text-secondary">
                  Verification adds a badge to your club profile and unlocks native court booking.
                </div>
              </div>
              <Link href="/settings">
                <Button className="bg-drift-warning hover:bg-drift-warning">
                  Verify now
                </Button>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              href="/members"
              icon="groups"
              label="Members"
              value={members.length}
              detail={`${activeMembers.length} active`}
            />
            <StatCard
              href="/leagues"
              icon="emoji_events"
              label="Active leagues"
              value={activeLeagues.length}
              tone="success"
            />
            <StatCard
              href="/disputes"
              icon="gavel"
              label="Open disputes"
              value={disputes.length}
              tone="error"
            />
            <StatCard
              href="/events"
              icon="event"
              label="Upcoming event"
              value={nextEvent ? 1 : 0}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-5">
              <Panel>
                <SectionTitle
                  title="Needs your attention"
                  action={<SmallActionLink href="/disputes">View disputes</SmallActionLink>}
                />
                <div className="mt-3.5 flex flex-col gap-2.5">
                  {disputes.length === 0 ? (
                    <div className="rounded-md border border-drift-border bg-drift-background px-3 py-4 text-sm text-drift-text-secondary">
                      No open disputes.
                    </div>
                  ) : (
                    disputes.slice(0, 3).map((dispute) => (
                      <div
                        key={dispute.fixtureId}
                        className="flex items-center gap-3 rounded-md border border-drift-error-surface bg-drift-error-surface/30 p-3"
                      >
                        <IconChip icon="gavel" tone="error" round />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold leading-snug text-drift-text-primary">
                            {playerName(dispute.sideA)} vs. {playerName(dispute.sideB)} - score disputed
                          </div>
                          <div className="text-xs text-drift-text-secondary">
                            Fixture awaiting admin ruling
                          </div>
                        </div>
                        <Link
                          href="/disputes"
                          className="shrink-0 rounded-md border border-drift-border bg-drift-surface px-3.5 py-[7px] text-[12.5px] font-bold text-drift-text-primary"
                        >
                          Review
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel>
                <SectionTitle
                  title="Coming up"
                  action={<SmallActionLink href="/events">View calendar</SmallActionLink>}
                />
                <div className="mt-3.5 flex flex-col gap-1">
                  {comingUp.length === 0 ? (
                    <div className="rounded-md border border-drift-border bg-drift-background px-3 py-4 text-sm text-drift-text-secondary">
                      No events scheduled.
                    </div>
                  ) : (
                    comingUp.map((item, index) => (
                      <Link
                        href={item.href}
                        key={item.id}
                        className={`flex items-center gap-3.5 px-1 py-3 ${
                          index < comingUp.length - 1 ? "border-b border-drift-neutral-surface" : ""
                        }`}
                      >
                        <DateChip value={item.date} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold text-drift-text-primary">
                            {item.title}
                          </div>
                          <div className="text-xs text-drift-text-secondary">{item.detail}</div>
                        </div>
                        <StatusBadge status={item.status} />
                      </Link>
                    ))
                  )}
                </div>
              </Panel>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <Panel>
                <SectionTitle title="Quick actions" />
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <QuickAction href="/members" icon="person_add" label="Invite member" />
                  <QuickAction href="/announcements" icon="campaign" label="New announcement" />
                  <QuickAction href="/events/new" icon="event" label="Create event" />
                  <QuickAction href="/ladders" icon="emoji_events" label="New ladder" />
                </div>
              </Panel>

              <Panel>
                <SectionTitle title="Recent activity" />
                <div className="mt-3.5 flex flex-col gap-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-drift-text-secondary">
                      Activity will appear as members, events, and announcements change.
                    </p>
                  ) : (
                    recentActivity.map((item) => (
                      <div key={item.id} className="flex gap-2.5">
                        <MaterialIcon
                          name={item.icon}
                          className={`mt-px shrink-0 text-[17px] ${
                            item.tone === "success"
                              ? "text-drift-success"
                              : "text-drift-primary"
                          }`}
                        />
                        <div className="text-[13px] leading-snug text-drift-text-primary">
                          {item.text}{" "}
                          <span className="text-drift-text-secondary">/ {item.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel>
                <SectionTitle title="Club status" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-drift-text-secondary">Verification</span>
                  {club ? <StatusBadge status={club.verificationStatus} /> : <Badge>Unknown</Badge>}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
  detail,
  tone = "info",
}: {
  href: string;
  icon: string;
  label: string;
  value: number;
  detail?: string;
  tone?: "info" | "success" | "warning" | "error" | "neutral";
}) {
  return (
    <Link
      href={href}
      aria-label={`View ${label.toLowerCase()}`}
      className="actionbtn flex items-center gap-3 rounded-lg border border-drift-border bg-drift-surface px-[18px] py-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1"
    >
      <IconChip icon={icon} tone={tone} />
      <div className="min-w-0">
        <div className="text-[22px] font-extrabold leading-7 text-drift-text-primary tabular">
          {value}
        </div>
        <div className="text-xs text-drift-text-secondary">{detail ?? label}</div>
      </div>
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
      className="actionbtn flex min-w-0 flex-col gap-2 rounded-md border border-drift-border p-3.5 transition-colors"
    >
      <MaterialIcon name={icon} className="text-xl text-drift-primary" />
      <span className="text-[13px] font-semibold text-drift-text-primary">{label}</span>
    </Link>
  );
}
