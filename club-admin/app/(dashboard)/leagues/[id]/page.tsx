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
  PageHeader,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { RichText } from "@/components/RichTextEditor";
import { SelectEditControl } from "@/components/EditFieldModal";
import type {
  LeagueRegistrationStatus,
  LeagueState,
  LeagueSummary,
  RoundDto,
  StandingRow,
} from "@/lib/types";

type RegisteredPlayer = {
  registrationId: string;
  status: LeagueRegistrationStatus;
  player: { id: string; firstName: string | null; lastName: string | null } | null;
};

const TABS = ["Registrations", "Fixtures", "Standings"] as const;
type Tab = (typeof TABS)[number];

function toLocalInput(iso: string | null) {
  return iso ? iso.slice(0, 16) : "";
}

export default function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const [league, setLeague] = useState<LeagueSummary | null>(null);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [round, setRound] = useState<RoundDto | null>(null);
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

  useEffect(() => {
    if (tab === "Fixtures") {
      api
        .get<{ round: RoundDto | null }>(`/leagues/${id}/rounds/current`)
        .then((res) => setRound(res.round));
    }
    if (tab === "Standings") {
      api
        .get<{ standings: StandingRow[] }>(`/leagues/${id}/standings`)
        .then((res) => setStandings(res.standings));
    }
  }, [tab, id]);

  async function patchLeague(body: Record<string, unknown>) {
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/leagues/${id}`, body);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
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
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleGenerateFixtures() {
    setError(null);
    setGenerating(true);
    try {
      await api.post(`/leagues/${id}/generate-fixtures`);
      const res = await api.get<{ round: RoundDto | null }>(
        `/leagues/${id}/rounds/current`,
      );
      setRound(res.round);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleComplete() {
    setError(null);
    try {
      await api.post(`/leagues/${id}/complete`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The league could not be archived.",
      );
    }
  }

  if (loading || !league) {
    return <p className="text-sm text-drift-text-secondary">Loading…</p>;
  }

  const started =
    league.competitionState === "ACTIVE" ||
    league.competitionState === "COMPLETED";
  const closed =
    league.competitionState === "COMPLETED" ||
    league.competitionState === "CANCELLED";

  return (
    <div>
      <PageHeader
        title={league.name}
        description={`${league.sport} · ${league.format} · ${league.enrolledCount} enrolled${
          league.capacity ? ` / ${league.capacity}` : ""
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={league.competitionState} />
            {canManage && (
              <>
                <Link href={`/leagues/${id}/rules`}>
                  <Button variant="secondary">Rules &amp; scoring</Button>
                </Link>
                <SelectEditControl
                  value={league.state}
                  options={[
                    { value: "DRAFT", label: "Draft" },
                    { value: "PUBLISHED", label: "Published" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ]}
                  onSave={(next) =>
                    patchLeague({ state: next as LeagueState }).then(() => {})
                  }
                  title="Change league status"
                  description={league.name}
                  fieldLabel="Status"
                  confirmLabel="Save status"
                />
                {!closed && (
                  <Button variant="secondary" onClick={() => void handleComplete()}>
                    Complete &amp; archive
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />
      <ErrorBanner message={error} />

      {league.rulesText && (
        <Card className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-drift-text-secondary">
            Rules
          </h2>
          <RichText html={league.rulesText} />
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <ScheduleItem label="Registration opens" value={league.registrationOpensAt} />
            <ScheduleItem label="Registration closes" value={league.registrationClosesAt} />
            <ScheduleItem label="Starts" value={league.startsAt} />
            <div>
              <dt className="font-semibold text-drift-text-secondary">Rounds</dt>
              <dd className="mt-1 font-bold text-drift-text-primary">
                {league.roundCount ?? "—"}
              </dd>
            </div>
          </dl>
          {canManage && !started && (
            <Button variant="secondary" onClick={() => setShowSchedule((s) => !s)}>
              {showSchedule ? "Cancel" : "Edit schedule"}
            </Button>
          )}
        </div>

        {showSchedule && (
          <form
            onSubmit={handleSchedule}
            className="mt-5 flex flex-col gap-4 border-t border-drift-border pt-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Registration opens">
                <Input
                  type="datetime-local"
                  required
                  value={schedule.registrationOpensAt}
                  onChange={(e) =>
                    setSchedule({ ...schedule, registrationOpensAt: e.target.value })
                  }
                />
              </Field>
              <Field label="Registration closes">
                <Input
                  type="datetime-local"
                  required
                  value={schedule.registrationClosesAt}
                  onChange={(e) =>
                    setSchedule({ ...schedule, registrationClosesAt: e.target.value })
                  }
                />
              </Field>
              <Field label="Starts">
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
              <Field label="Number of rounds">
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
              <Field label="Capacity (optional)">
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
              {saving ? "Saving…" : "Save schedule"}
            </Button>
          </form>
        )}
      </Card>

      <div className="mb-6 flex gap-1 border-b border-drift-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === t
                ? "border-b-2 border-drift-primary text-drift-primary"
                : "text-drift-text-secondary hover:text-drift-text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Registrations" && (
        <DataTable
          rows={players}
          rowKey={(p) => p.registrationId}
          emptyMessage="No one has registered yet."
          columns={[
            {
              header: "Player",
              cell: (p) =>
                `${p.player?.firstName ?? ""} ${p.player?.lastName ?? ""}`.trim() ||
                "—",
            },
            { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
            {
              header: "",
              cell: (p) =>
                canManage ? (
                  <div className="flex gap-3">
                    {p.status !== "ENROLLED" && (
                      <button
                        onClick={() =>
                          handleRegistrationUpdate(p.registrationId, "ENROLLED")
                        }
                        className="text-sm font-semibold text-drift-primary hover:underline"
                      >
                        Enroll
                      </button>
                    )}
                    {p.status !== "WAITLISTED" && (
                      <button
                        onClick={() =>
                          handleRegistrationUpdate(p.registrationId, "WAITLISTED")
                        }
                        className="text-sm font-semibold text-drift-text-secondary hover:underline"
                      >
                        Waitlist
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleRegistrationUpdate(p.registrationId, "WITHDRAWN")
                      }
                      className="text-sm font-semibold text-drift-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : null,
            },
          ]}
        />
      )}

      {tab === "Fixtures" && (
        <div>
          {canManage && (
            <div className="mb-4">
              <Button onClick={handleGenerateFixtures} disabled={generating}>
                {generating ? "Generating…" : "Generate fixtures"}
              </Button>
            </div>
          )}
          {!round ? (
            <p className="text-sm text-drift-text-secondary">No round open yet.</p>
          ) : (
            <Card>
              <div className="mb-3 text-sm font-semibold text-drift-text-primary">
                Round {round.index}
              </div>
              <div className="flex flex-col gap-2">
                {round.fixtures.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-md border border-drift-border px-3 py-2 text-sm"
                  >
                    <span>
                      {f.sideA
                        ? `${f.sideA.firstName ?? ""} ${f.sideA.lastName ?? ""}`
                        : "TBD"}
                      {" vs "}
                      {f.isBye
                        ? "Bye"
                        : f.sideB
                          ? `${f.sideB.firstName ?? ""} ${f.sideB.lastName ?? ""}`
                          : "TBD"}
                    </span>
                    {f.match && <StatusBadge status={f.match.state} />}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "Standings" && (
        <DataTable
          rows={standings}
          rowKey={(s) => s.userId}
          emptyMessage="No standings yet."
          columns={[
            { header: "Rank", cell: (s) => s.rank },
            { header: "Player", cell: (s) => s.displayName },
            { header: "Points", cell: (s) => s.points },
            { header: "W-L", cell: (s) => `${s.wins}-${s.losses}` },
            { header: "Prev. rank", cell: (s) => s.previousRank ?? "—" },
          ]}
        />
      )}
    </div>
  );
}

function ScheduleItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="font-semibold text-drift-text-secondary">{label}</dt>
      <dd className="mt-1 font-bold text-drift-text-primary">
        {value ? new Date(value).toLocaleString() : "—"}
      </dd>
    </div>
  );
}
