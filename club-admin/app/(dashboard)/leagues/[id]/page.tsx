"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  Td,
  Th,
} from "@/components/ui";
import { ActionMenu, BackButton, ManagementCard, SummaryStrip } from "@/components/redesign";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { AddRegistrationModal, AddResultModal, RoundSelector } from "@/components/LeagueWorkflows";
import { StatusBadge } from "@/components/StatusBadge";
import { RichText } from "@/components/RichTextEditor";
import { SelectEditControl } from "@/components/EditFieldModal";
import type {
  LeagueRegistrationStatus,
  LeagueState,
  Fixture,
  LeagueSummary,
  RoundDto,
  RoundSummary,
  StandingRow,
} from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

type RegisteredPlayer = {
  registrationId: string;
  status: LeagueRegistrationStatus;
  player: { id: string; firstName: string | null; lastName: string | null } | null;
};

const TABS = ["Registrations", "Fixtures", "Standings"] as const;
type Tab = (typeof TABS)[number];
const TAB_ICONS: Record<Tab, string> = {
  Registrations: "groups",
  Fixtures: "event",
  Standings: "leaderboard",
};

function toLocalInput(iso: string | null) {
  return iso ? iso.slice(0, 16) : "";
}

export default function LeagueDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const [league, setLeague] = useState<LeagueSummary | null>(null);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [round, setRound] = useState<RoundDto | null>(null);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [resultFixture, setResultFixture] = useState<Fixture | null>(null);
  const [showAddRegistration, setShowAddRegistration] = useState(false);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [tab, setTab] = useState<Tab>("Registrations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState({
    registrationOpensAt: "",
    registrationClosesAt: "",
    startsAt: "",
    roundCount: 4,
    capacity: "",
  });

  const load = useCallback(async () => {
    const res = await api.get<LeagueSummary>(`/leagues/${id}`);
    setLeague(res);
    setSchedule({
      registrationOpensAt: toLocalInput(res.registrationOpensAt),
      registrationClosesAt: toLocalInput(res.registrationClosesAt),
      startsAt: toLocalInput(res.startsAt),
      roundCount: res.roundCount ?? 4,
      capacity: res.capacity?.toString() ?? "",
    });
    setLoading(false);
  }, [id]);

  const loadPlayers = useCallback(async () => {
    const res = await api.get<{ players: RegisteredPlayer[] }>(
      `/leagues/${id}/registrations`,
    );
    setPlayers(res.players);
  }, [id]);

  useEffect(() => {
    void load();
    void loadPlayers();
  }, [load, loadPlayers]);

  /**
   * The round list drives the selector; the fixtures themselves come from the
   * by-id read. With nothing selected yet (or the selection gone) it opens on
   * the current round: the latest one that has opened, else the first.
   */
  const loadRounds = useCallback(
    async (keepId?: string | null) => {
      const res = await api.get<{ rounds: RoundSummary[] }>(`/leagues/${id}/rounds`);
      setRounds(res.rounds);
      const wanted =
        res.rounds.find((r) => r.id === keepId) ??
        [...res.rounds].reverse().find((r) => r.openedAt) ??
        res.rounds[0] ??
        null;
      setSelectedRoundId(wanted?.id ?? null);
      if (wanted) {
        const detail = await api.get<{ round: RoundDto | null }>(`/leagues/${id}/rounds/${wanted.id}`);
        setRound(detail.round);
      } else {
        setRound(null);
      }
    },
    [id],
  );

  useEffect(() => {
    if (tab === "Fixtures") void loadRounds();
    if (tab === "Standings") {
      api
        .get<{ standings: StandingRow[] }>(`/leagues/${id}/standings`)
        .then((res) => setStandings(res.standings));
    }
  }, [tab, id, loadRounds]);

  async function patchLeague(body: Record<string, unknown>) {
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/leagues/${id}`, body);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    try {
      await patchLeague({
        registrationOpensAt: new Date(schedule.registrationOpensAt).toISOString(),
        registrationClosesAt: new Date(
          schedule.registrationClosesAt,
        ).toISOString(),
        startsAt: new Date(schedule.startsAt).toISOString(),
        roundCount: Number(schedule.roundCount),
        capacity: schedule.capacity ? Number(schedule.capacity) : undefined,
      });
      setShowSchedule(false);
    } catch {
      /* error already surfaced */
    }
  }

  async function handleRegistrationUpdate(
    registrationId: string,
    status: LeagueRegistrationStatus,
  ) {
    setError(null);
    try {
      await api.patch(`/leagues/${id}/registrations/${registrationId}`, {
        status,
      });
      await Promise.all([loadPlayers(), load()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }

  async function handleGenerateFixtures() {
    setError(null);
    setGenerating(true);
    try {
      await api.post(`/leagues/${id}/generate-fixtures`);
      await loadRounds(selectedRoundId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setGenerating(false);
    }
  }

  async function afterResultSaved() {
    await loadRounds(selectedRoundId);
    const res = await api.get<{ standings: StandingRow[] }>(`/leagues/${id}/standings`);
    setStandings(res.standings);
  }

  async function handleComplete() {
    setError(null);
    try {
      await api.post(`/leagues/${id}/complete`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("a.theLeagueCouldNotBe"),
      );
    }
  }

  if (loading || !league) {
    return <p className="text-sm text-drift-text-secondary">{t("a.loading")}</p>;
  }

  const started =
    league.competitionState === "ACTIVE" ||
    league.competitionState === "COMPLETED";
  const closed =
    league.competitionState === "COMPLETED" ||
    league.competitionState === "CANCELLED";

  const tabLabels: Record<Tab, string> = {
    Registrations: t("ld.tabRegistrations"),
    Fixtures: t("ld.tabFixtures"),
    Standings: t("ld.tabStandings"),
  };
  // An admin can record a result until one is confirmed; a disputed one goes
  // through the Disputes page instead.
  const canRecordResult = (f: Fixture) =>
    f.match != null &&
    f.match.state !== "DISPUTED" &&
    f.match.result?.status !== "CONFIRMED" &&
    !["CANCELLED", "EXPIRED", "COMPLETED", "WALKOVER", "RETIRED"].includes(f.match.state);

  const fullName = (person: { firstName: string | null; lastName: string | null } | null) =>
    person ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() : "";
  const fillPercent = league.capacity
    ? Math.min(100, Math.round((league.enrolledCount / league.capacity) * 100))
    : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <BackButton href="/leagues">{t("ld.backAll")}</BackButton>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/leagues/${id}/rules`}>
              <Button variant="secondary">
                <MaterialIcon name="settings" className="text-[18px]" />
                {t("a.rulesScoring")}
              </Button>
            </Link>
            <SelectEditControl
              value={league.state}
              options={[
                { value: "DRAFT", label: t("a.draft") },
                { value: "PUBLISHED", label: t("a.published") },
                { value: "CANCELLED", label: t("a.cancelled") },
              ]}
              onSave={(next) =>
                patchLeague({ state: next as LeagueState }).then(() => {})
              }
              title={t("a.changeLeagueStatus")}
              description={league.name}
              fieldLabel={t("a.status")}
              confirmLabel={t("a.saveStatus")}
            />
            {!closed && (
              <Button onClick={() => void handleComplete()}>{t("a.completeArchive")}</Button>
            )}
          </div>
        )}
      </div>
      <ErrorBanner message={error} />

      <section className="mb-[18px] flex flex-wrap items-center gap-6 overflow-hidden rounded-2xl border border-drift-border bg-drift-surface p-6 shadow-card">
        <div className="flex h-[96px] w-[96px] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#0077cc] to-[#005a9e] text-white">
          <MaterialIcon name="emoji_events" className="text-[34px]" />
        </div>
        <div className="min-w-0 flex-1">
          <StatusBadge status={league.competitionState} />
          <h1 className="mt-2 truncate font-display text-[clamp(22px,2.4vw,30px)] font-extrabold leading-tight text-drift-text-primary">
            {league.name}
          </h1>
          <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-semibold text-drift-text-secondary">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-drift-neutral-surface px-2.5 py-1">
              <MaterialIcon name="sports_tennis" className="text-[14px]" />
              {league.sport} · {league.format}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-drift-neutral-surface px-2.5 py-1">
              <MaterialIcon name="groups" className="text-[14px]" />
              {t("lg.enrolled", { count: league.enrolledCount })}
            </span>
          </div>
        </div>
        {fillPercent !== null && (
          <div
            className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--color-primary) ${fillPercent}%, var(--color-neutral-surface) 0)`,
            }}
          >
            <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-drift-surface">
              <strong className="text-[18px] font-extrabold leading-none text-drift-text-primary">
                {fillPercent}%
              </strong>
              <span className="mt-1 text-[11px] text-drift-text-secondary">{t("ld.placesFilled")}</span>
            </div>
          </div>
        )}
      </section>

      <SummaryStrip
        columns={4}
        items={[
          {
            icon: "groups",
            value: league.capacity ? `${league.enrolledCount}/${league.capacity}` : league.enrolledCount,
            label: t("ld.registration"),
          },
          { icon: "event_repeat", tone: "lime", value: league.roundCount ?? "—", label: t("a.rounds") },
          {
            icon: "play_circle",
            tone: "gold",
            value: league.startsAt ? <ShortDate value={league.startsAt} /> : "—",
            label: t("a.starts"),
          },
          {
            icon: "how_to_reg",
            tone: "coral",
            value: league.registrationClosesAt ? <ShortDate value={league.registrationClosesAt} /> : "—",
            label: t("a.registrationCloses"),
          },
        ]}
      />

      {league.rulesText && (
        <Card className="mb-[18px]">
          <h2 className="mb-2 text-[13px] font-extrabold text-drift-text-primary">{t("a.rules")}</h2>
          <RichText html={league.rulesText} />
        </Card>
      )}

      <Card className="mb-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-4">
            <ScheduleItem label={t("a.registrationOpens")} value={league.registrationOpensAt} />
            <ScheduleItem label={t("a.registrationCloses")} value={league.registrationClosesAt} />
            <ScheduleItem label={t("a.starts")} value={league.startsAt} />
            <div>
              <dt className="text-[11px] font-bold text-drift-text-secondary">{t("a.rounds")}</dt>
              <dd className="mt-1 font-bold text-drift-text-primary">
                {league.roundCount ?? "—"}
              </dd>
            </div>
          </dl>
          {canManage && !started && (
            <Button variant="secondary" size="sm" onClick={() => setShowSchedule((s) => !s)}>
              {showSchedule ? t("a.cancel") : t("a.editSchedule")}
            </Button>
          )}
        </div>

        {showSchedule && (
          <form
            onSubmit={handleSchedule}
            className="mt-5 flex flex-col gap-4 border-t border-drift-border pt-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t("a.registrationOpens")}>
                <Input
                  type="datetime-local"
                  required
                  value={schedule.registrationOpensAt}
                  onChange={(e) =>
                    setSchedule({ ...schedule, registrationOpensAt: e.target.value })
                  }
                />
              </Field>
              <Field label={t("a.registrationCloses")}>
                <Input
                  type="datetime-local"
                  required
                  value={schedule.registrationClosesAt}
                  onChange={(e) =>
                    setSchedule({ ...schedule, registrationClosesAt: e.target.value })
                  }
                />
              </Field>
              <Field label={t("a.starts")}>
                <Input
                  type="datetime-local"
                  required
                  value={schedule.startsAt}
                  onChange={(e) =>
                    setSchedule({ ...schedule, startsAt: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("a.numberOfRounds")}>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  required
                  value={schedule.roundCount}
                  onChange={(e) =>
                    setSchedule({ ...schedule, roundCount: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label={t("a.capacityOptional")}>
                <Input
                  type="number"
                  min={2}
                  value={schedule.capacity}
                  onChange={(e) =>
                    setSchedule({ ...schedule, capacity: e.target.value })
                  }
                />
              </Field>
            </div>
            <Button type="submit" disabled={saving} className="self-start">
              {saving ? t("common.saving") : t("a.saveSchedule")}
            </Button>
          </form>
        )}
      </Card>

      <div role="tablist" aria-label={t("ld.tabsLabel")} className="mb-[18px] flex gap-1 border-b border-drift-border">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-bold transition-colors ${
              tab === name
                ? "border-drift-primary text-drift-primary-dark"
                : "border-transparent text-drift-text-secondary hover:text-drift-text-primary"
            }`}
          >
            <MaterialIcon name={TAB_ICONS[name]} className="text-[18px]" />
            {tabLabels[name]}
            {name === "Registrations" && (
              <span className="rounded-full bg-drift-neutral-surface px-1.5 py-px text-[11px] font-bold text-drift-text-secondary">
                {players.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Registrations" && (
        <ManagementCard
          title={t("ld.playersTitle")}
          subtitle={t("ld.playersHint")}
          actions={
            canManage && !started && clubId ? (
              <Button onClick={() => setShowAddRegistration(true)}>
                <MaterialIcon name="person_add" className="text-[18px]" />
                {t("lw.addRegistration")}
              </Button>
            ) : undefined
          }
        >
          {players.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-drift-text-secondary">
              {t("a.noOneHasRegisteredYet")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    <Th>{t("a.player")}</Th>
                    <Th>{t("a.status")}</Th>
                    <Th className="w-[80px] text-right">{t("a.actions")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => {
                    const name = fullName(p.player) || "—";
                    return (
                      <tr key={p.registrationId} className="transition-colors hover:bg-drift-surface-sunken">
                        <Td>
                          <div className="flex items-center gap-[11px]">
                            <InitialsAvatar name={name} tone="auto" />
                            <strong className="text-[13px] font-bold text-drift-text-primary">{name}</strong>
                          </div>
                        </Td>
                        <Td>
                          <StatusBadge status={p.status} />
                        </Td>
                        <Td className="text-right">
                          {canManage && (
                            <ActionMenu
                              label={t("ld.moreActions", { name })}
                              items={[
                                ...(p.status !== "ENROLLED"
                                  ? [
                                      {
                                        icon: "how_to_reg",
                                        label: t("ld.enroll"),
                                        onSelect: () => void handleRegistrationUpdate(p.registrationId, "ENROLLED"),
                                      },
                                    ]
                                  : []),
                                ...(p.status !== "WAITLISTED"
                                  ? [
                                      {
                                        icon: "hourglass_top",
                                        label: t("ld.waitlist"),
                                        onSelect: () => void handleRegistrationUpdate(p.registrationId, "WAITLISTED"),
                                      },
                                    ]
                                  : []),
                                { divider: true as const },
                                {
                                  icon: "person_remove",
                                  label: t("ld.remove"),
                                  danger: true,
                                  onSelect: () => void handleRegistrationUpdate(p.registrationId, "WITHDRAWN"),
                                },
                              ]}
                            />
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ManagementCard>
      )}

      {tab === "Fixtures" && (
        <ManagementCard
          title={t("ld.fixturesTitle")}
          subtitle={t("ld.fixturesHint")}
          actions={
            canManage ? (
              <Button onClick={handleGenerateFixtures} disabled={generating}>
                <MaterialIcon name="auto_awesome" className="text-[18px]" />
                {generating ? t("a.generating") : t("a.generateFixtures")}
              </Button>
            ) : undefined
          }
        >
          {rounds.length > 0 && (
            <RoundSelector
              rounds={rounds}
              selectedId={selectedRoundId}
              onSelect={(roundId) => {
                setSelectedRoundId(roundId);
                void api
                  .get<{ round: RoundDto | null }>(`/leagues/${id}/rounds/${roundId}`)
                  .then((res) => setRound(res.round));
              }}
            />
          )}
          {!round ? (
            <p className="px-5 py-10 text-center text-[13px] text-drift-text-secondary">{t("a.noRoundOpenYet")}</p>
          ) : (
            <div className="p-4">
              <div className="mb-3 text-[12px] font-extrabold text-drift-text-primary">
                {t("ld.round", { n: round.index })}
              </div>
              <div className="flex flex-col gap-2">
                {round.fixtures.map((f) => {
                  const a = fullName(f.sideA) || t("ld.tbd");
                  const b = f.isBye ? t("a.bye") : fullName(f.sideB) || t("ld.tbd");
                  return (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-drift-border px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3 text-[13px] font-bold text-drift-text-primary">
                        <InitialsAvatar name={a} tone="auto" size={30} />
                        <span className="truncate">{a}</span>
                        <i className="text-[11px] font-semibold not-italic text-drift-text-secondary">{t("ld.vs")}</i>
                        <InitialsAvatar name={b} tone="auto" size={30} />
                        <span className="truncate">{b}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {f.match?.result?.sets && f.match.result.sets.length > 0 && (
                          <strong className="text-[12px] font-bold text-drift-text-primary tabular">
                            {f.match.result.sets.map((set) => `${set.sideAGames}–${set.sideBGames}`).join(", ")}
                          </strong>
                        )}
                        {f.match && <StatusBadge status={f.match.state} />}
                        {canManage && f.match && !f.isBye && canRecordResult(f) && (
                          <Button variant="secondary" size="sm" onClick={() => setResultFixture(f)}>
                            {t("lw.recordResult")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ManagementCard>
      )}

      {tab === "Standings" && (
        <ManagementCard title={t("ld.standingsTitle")} subtitle={t("ld.standingsHint")}>
          {standings.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-drift-text-secondary">{t("a.noStandingsYet")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    <Th>{t("a.rank")}</Th>
                    <Th>{t("a.player")}</Th>
                    <Th>{t("a.points")}</Th>
                    <Th>{t("ld.winLoss")}</Th>
                    <Th>{t("a.prevRank")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.userId} className="transition-colors hover:bg-drift-surface-sunken">
                      <Td className={row.rank === 1 ? "font-extrabold text-drift-primary" : "font-bold"}>{row.rank}</Td>
                      <Td>
                        <div className="flex items-center gap-[11px]">
                          <InitialsAvatar name={row.displayName} tone="auto" size={30} />
                          <strong className="text-[13px] font-bold">{row.displayName}</strong>
                        </div>
                      </Td>
                      <Td className="font-extrabold">{row.points}</Td>
                      <Td>{`${row.wins}-${row.losses}`}</Td>
                      <Td className="text-drift-text-secondary">{row.previousRank ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ManagementCard>
      )}
      {resultFixture && (
        <AddResultModal
          fixture={resultFixture}
          nameA={fullName(resultFixture.sideA) || t("ld.tbd")}
          nameB={fullName(resultFixture.sideB) || t("ld.tbd")}
          onClose={() => setResultFixture(null)}
          onSaved={afterResultSaved}
        />
      )}
      {showAddRegistration && clubId && (
        <AddRegistrationModal
          leagueId={id}
          clubId={clubId}
          registeredUserIds={players.flatMap((p) => (p.player ? [p.player.id] : []))}
          onClose={() => setShowAddRegistration(false)}
          onSaved={async () => {
            await Promise.all([loadPlayers(), load()]);
          }}
        />
      )}
    </div>
  );
}

function ShortDate({ value }: { value: string }) {
  const { formatDate } = useI18n();
  return <>{formatDate(value, { month: "short", day: "numeric" })}</>;
}

function ScheduleItem({ label, value }: { label: string; value: string | null }) {
  const { formatDate } = useI18n();
  return (
    <div>
      <dt className="text-[11px] font-bold text-drift-text-secondary">{label}</dt>
      <dd className="mt-1 font-bold text-drift-text-primary">
        {value ? formatDate(value, { dateStyle: "medium", timeStyle: "short" }) : "—"}
      </dd>
    </div>
  );
}
