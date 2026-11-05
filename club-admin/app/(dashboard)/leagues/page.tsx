"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ManagementCard, SegmentControl, SummaryStrip } from "@/components/redesign";
import { StatusBadge } from "@/components/StatusBadge";
import { MaterialIcon, ModalShell } from "@/components/dashboard-design";
import { RichTextEditor } from "@/components/RichTextEditor";
import type {
  AssessmentBranch,
  LeagueSummary,
  MatchFormat,
  MatchSport,
} from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

/** Empty string is "All levels" in the form; it posts as `undefined`. */
type LevelBandChoice = AssessmentBranch | "";

const levelBandLabels = (t: ReturnType<typeof useT>): Record<AssessmentBranch, string> => ({
  BEGINNER: t("a.beginner"),
  FOUNDATIONAL: t("a.foundational"),
  INTERMEDIATE: t("a.intermediate"),
  ADVANCED: t("a.advanced"),
});

type LeagueFilter = "ALL" | "ACTIVE" | "COMPLETED" | "DRAFT";

/** A league counts as live from registration through play. */
const LIVE_STATES = ["ACTIVE", "REGISTRATION_OPEN", "SCHEDULED"];

// Decorative banners; fixed colours (not theme tokens) so the white label stays
// legible in dark mode too.
const BANNERS = [
  "from-[#0077cc] to-[#005a9e]",
  "from-[#0f766e] to-[#115e59]",
  "from-[#4f46e5] to-[#3730a3]",
];

type LeagueForm = {
  name: string;
  description: string;
  sport: MatchSport;
  format: MatchFormat;
  levelBand: LevelBandChoice;
  registrationOpensAt: string;
  registrationClosesAt: string;
  startsAt: string;
  roundCount: number;
  capacity: string;
  rulesText: string;
};

const EMPTY_FORM: LeagueForm = {
  name: "",
  description: "",
  sport: "TENNIS",
  format: "SINGLES",
  levelBand: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  startsAt: "",
  roundCount: 4,
  capacity: "",
  rulesText: "",
};

export default function LeaguesPage() {
  const t = useT();
  const LEVEL_BAND_LABELS = levelBandLabels(t);
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<LeagueForm>(EMPTY_FORM);
  const [filter, setFilter] = useState<LeagueFilter>("ALL");

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ leagues: LeagueSummary[] }>(
      `/clubs/${clubId}/leagues`,
    );
    setLeagues(res.leagues);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    const opens = new Date(form.registrationOpensAt);
    const closes = new Date(form.registrationClosesAt);
    const starts = new Date(form.startsAt);
    if (opens >= closes) {
      setError(t("a.registrationMustOpenBeforeIt"));
      return;
    }
    if (closes > starts) {
      setError(t("a.registrationMustCloseOnOr"));
      return;
    }
    setCreating(true);
    try {
      await api.post(`/clubs/${clubId}/leagues`, {
        name: form.name,
        description: form.description || undefined,
        sport: form.sport,
        format: form.format,
        // Omitted rather than sent as null: the API treats an absent band as
        // "all levels", which is what the empty choice means.
        levelBand: form.levelBand || undefined,
        registrationOpensAt: opens.toISOString(),
        registrationClosesAt: closes.toISOString(),
        startsAt: starts.toISOString(),
        roundCount: Number(form.roundCount),
        capacity: form.capacity ? Number(form.capacity) : undefined,
        rulesText: form.rulesText || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setCreating(false);
    }
  }

  const live = useMemo(() => leagues.filter((l) => LIVE_STATES.includes(l.competitionState)), [leagues]);
  const visible = useMemo(
    () =>
      leagues.filter((league) => {
        if (filter === "ALL") return true;
        if (filter === "ACTIVE") return LIVE_STATES.includes(league.competitionState);
        return league.competitionState === filter;
      }),
    [leagues, filter],
  );

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.competitions")}
        title={t("a.leagues")}
        description={t("a.createAndManageYourClub")}
        action={
          canManage ? (
            <Button onClick={() => setShowForm(true)}>
              <MaterialIcon name="add" className="text-[19px]" />
              {t("a.newLeague")}
            </Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message={t("a.loading2")} />
      ) : leagues.length === 0 ? (
        <EmptyState message={t("a.createYourFirstLeague")} />
      ) : (
        <>
          <SummaryStrip
            items={[
              { icon: "emoji_events", value: leagues.length, label: t("lg.totalLeagues") },
              { icon: "bolt", tone: "lime", value: live.length, label: t("lg.live") },
              {
                icon: "groups",
                tone: "gold",
                value: live.reduce((sum, league) => sum + league.enrolledCount, 0),
                label: t("lg.playersCompeting"),
              },
            ]}
          />
          <ManagementCard
            title={t("lg.workspace")}
            subtitle={t("lg.count", { count: visible.length })}
            actions={
              <SegmentControl<LeagueFilter>
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "ALL", label: t("lg.filterAll") },
                  { value: "ACTIVE", label: t("lg.filterActive") },
                  { value: "COMPLETED", label: t("lg.filterCompleted") },
                  { value: "DRAFT", label: t("lg.filterDraft") },
                ]}
              />
            }
          >
            {visible.length === 0 ? (
              <EmptyState bare icon="emoji_events" title={t("lg.noMatches")} />
            ) : (
              <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((league, index) => (
                  <Link href={`/leagues/${league.id}`} key={league.id} className="group block h-full">
                    <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-drift-border bg-drift-surface transition-all group-hover:-translate-y-px group-hover:border-drift-primary">
                      <div
                        className={`flex h-[92px] items-end justify-between bg-gradient-to-br ${BANNERS[index % BANNERS.length]} p-3.5 text-white`}
                      >
                        <MaterialIcon
                          name={league.sport === "PADEL" ? "groups" : "emoji_events"}
                          className="text-[26px]"
                        />
                        <span className="text-[11px] font-bold uppercase">
                          {t("lg.season", { n: String(index + 1).padStart(2, "0") })}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <StatusBadge status={league.competitionState} />
                        <h3 className="mt-2.5 truncate text-[15px] font-extrabold text-drift-text-primary">
                          {league.name}
                        </h3>
                        <p className="mt-1 text-[12px] text-drift-text-secondary">
                          {league.sport.replace("_", " ")} · {league.format.replace("_", " ")} ·{" "}
                          {league.levelBand ? LEVEL_BAND_LABELS[league.levelBand] : t("a.allLevels")}
                          {league.roundCount ? ` · ${t("lg.rounds", { count: league.roundCount })}` : ""}
                        </p>
                        <div className="mt-3.5 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-drift-text-secondary">{t("lg.registration")}</span>
                          <strong className="font-bold text-drift-text-primary">
                            {league.capacity
                              ? t("lg.places", { enrolled: league.enrolledCount, capacity: league.capacity })
                              : t("lg.enrolled", { count: league.enrolledCount })}
                          </strong>
                        </div>
                        {league.capacity ? (
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-drift-neutral-surface">
                            <div
                              className="h-full rounded-full bg-drift-primary"
                              style={{ width: `${Math.min(100, (league.enrolledCount / league.capacity) * 100)}%` }}
                            />
                          </div>
                        ) : null}
                        <span className="mt-auto inline-flex items-center gap-0.5 pt-3.5 text-[12px] font-bold text-drift-primary">
                          {t("a.manage")}
                          <MaterialIcon name="chevron_right" className="text-[16px]" />
                        </span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </ManagementCard>
        </>
      )}

      {showForm && (
        <ModalShell title={t("a.newLeague")} size="lg" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label={t("a.leagueName")}>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label={t("a.description")}>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("a.sport")}>
                <Select
                  value={form.sport}
                  onChange={(e) =>
                    setForm({ ...form, sport: e.target.value as MatchSport })
                  }
                >
                  <option value="TENNIS">{t("a.tennis")}</option>
                  <option value="PADEL">{t("a.padel")}</option>
                </Select>
              </Field>
              <Field label={t("a.format")}>
                <Select
                  value={form.format}
                  onChange={(e) =>
                    setForm({ ...form, format: e.target.value as MatchFormat })
                  }
                >
                  <option value="SINGLES">{t("a.singles")}</option>
                  <option value="DOUBLES">{t("a.doubles")}</option>
                </Select>
              </Field>
            </div>
            <Field label={t("a.level")}>
              <Select
                value={form.levelBand}
                onChange={(e) =>
                  setForm({
                    ...form,
                    levelBand: e.target.value as LevelBandChoice,
                  })
                }
              >
                <option value="">{t("a.allLevels")}</option>
                {(
                  Object.keys(LEVEL_BAND_LABELS) as AssessmentBranch[]
                ).map((band) => (
                  <option key={band} value={band}>
                    {LEVEL_BAND_LABELS[band]}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[12px] text-drift-text-secondary">
                {t("a.guidanceForPlayersBrowsingLeagues")}
              </p>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t("a.registrationOpens")}>
                <Input
                  type="datetime-local"
                  required
                  value={form.registrationOpensAt}
                  onChange={(e) =>
                    setForm({ ...form, registrationOpensAt: e.target.value })
                  }
                />
              </Field>
              <Field label={t("a.registrationCloses")}>
                <Input
                  type="datetime-local"
                  required
                  value={form.registrationClosesAt}
                  onChange={(e) =>
                    setForm({ ...form, registrationClosesAt: e.target.value })
                  }
                />
              </Field>
              <Field label={t("a.leagueStarts")}>
                <Input
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
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
                  value={form.roundCount}
                  onChange={(e) =>
                    setForm({ ...form, roundCount: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label={t("a.capacityOptional")}>
                <Input
                  type="number"
                  min={2}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label={t("a.rules")}>
              <RichTextEditor
                value={form.rulesText}
                onChange={(html) => setForm({ ...form, rulesText: html })}
                placeholder={t("a.scoringSchedulingConductAnythingPlayers")}
              />
            </Field>
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                {t("a.cancel")}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? t("a.creating") : t("a.createLeague")}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
