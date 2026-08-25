"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import type {
  CompetitionDetailResponse,
  LadderDetail,
  LeagueDetail,
  TournamentDetail,
} from "@/lib/competition-types";
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, Td, Th, statusTone } from "@/components/ui";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "n/a";
}

function personName(person: { firstName: string | null; lastName: string | null; email?: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Unknown";
}

function date(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CompetitionDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const [competition, setCompetition] = useState<CompetitionDetailResponse["competition"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const response = await api.get<CompetitionDetailResponse>(`/competitions/${params.type}/${params.id}`);
        setCompetition(response.competition);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Competition detail could not be loaded.");
      }
    }
    void load();
  }, [params.id, params.type]);

  return (
    <div>
      <PageHeader
        title={competition?.name ?? "Competition detail"}
        description="Platform-wide competition record and lifecycle state."
        action={<Link href="/competitions" className="text-sm font-semibold text-drift-primary hover:underline">Back to competitions</Link>}
      />
      <ErrorBanner message={error} />
      {!competition && !error && <EmptyState message="Loading competition detail..." />}
      {competition && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-drift-border bg-drift-surface px-4 py-3">
            <Badge tone="info">{label(competition.type)}</Badge>
            <Badge tone={statusTone(competition.state)}>{label(competition.state)}</Badge>
            <Badge tone="neutral">{label(competition.sport)}</Badge>
            {"format" in competition && competition.format && <Badge tone="neutral">{label(competition.format)}</Badge>}
            {competition.club ? (
              <Link href={`/organizations/${competition.club.id}`} className="text-sm font-semibold text-drift-primary hover:underline">
                {competition.club.name}
              </Link>
            ) : (
              <span className="text-sm text-drift-text-secondary">Platform-run</span>
            )}
          </div>

          <Card>
            <h2 className="mb-4 font-display text-xl font-semibold text-drift-text-primary">Overview</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Created" value={date(competition.createdAt)} />
              {"updatedAt" in competition && <Metric label="Updated" value={date(competition.updatedAt)} />}
              {competition.type === "TOURNAMENT" && <Metric label="Draw size" value={`${competition.drawSize}`} />}
              {competition.type === "TOURNAMENT" && <Metric label="Registration closes" value={date(competition.registrationClosesAt)} />}
              {competition.type === "LADDER" && <Metric label="Challenge range" value={`${competition.challengeRange} rungs`} />}
              {"description" in competition && competition.description && <div className="md:col-span-3"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Description</div><div className="mt-1 text-sm text-drift-text-primary">{competition.description}</div></div>}
            </div>
          </Card>

          {competition.type === "LEAGUE" && <LeaguePanel league={competition} />}
          {competition.type === "TOURNAMENT" && <TournamentPanel tournament={competition} />}
          {competition.type === "LADDER" && <LadderPanel ladder={competition} />}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-drift-text-secondary">{label}</div>
      <div className="mt-1 text-sm font-semibold text-drift-text-primary">{value}</div>
    </div>
  );
}

function LeaguePanel({ league }: { league: LeagueDetail & { type: "LEAGUE" } }) {
  const ruleRows = [
    ["Scoring format", league.scoringFormat],
    ["Walkover rule", league.walkoverRule],
    ["Unfinished match policy", league.unfinishedMatchPolicy],
    ["Rules text", league.rulesText],
  ];
  return (
    <>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-drift-text-primary">Rules</h2>
          <Link href="/competitions/rulesets" className="text-sm font-semibold text-drift-primary hover:underline">Manage rulesets</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {ruleRows.map(([name, value]) => (
            <div key={name}>
              <div className="text-xs font-semibold uppercase text-drift-text-secondary">{name}</div>
              <div className="mt-1 text-sm text-drift-text-primary">{value || "Not set"}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[820px]">
          <thead><tr><Th>Season</Th><Th>Registration</Th><Th>Starts</Th><Th>Rounds</Th><Th>Players</Th><Th>Status</Th></tr></thead>
          <tbody>
            {league.seasons.map((season) => (
              <tr key={season.id}>
                <Td className="font-semibold">{season.label}</Td>
                <Td>{date(season.registrationOpensAt)}<div className="text-xs text-drift-text-secondary">to {date(season.registrationClosesAt)}</div></Td>
                <Td>{date(season.startsAt)}</Td>
                <Td>{season._count.rounds} / {season.roundCount}</Td>
                <Td>{season._count.registrations}{season.capacity ? ` of ${season.capacity}` : ""}</Td>
                <Td><Badge tone={season.cancelledAt ? "error" : season.completedAt ? "success" : "warning"}>{season.cancelledAt ? "Cancelled" : season.completedAt ? "Completed" : "Scheduled"}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </table>
        {league.seasons.length === 0 && <div className="p-4"><EmptyState message="No seasons exist for this league." /></div>}
      </Card>
    </>
  );
}

function TournamentPanel({ tournament }: { tournament: TournamentDetail & { type: "TOURNAMENT" } }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px]">
          <thead><tr><Th>Entry</Th><Th>Seed</Th><Th>Registered</Th></tr></thead>
          <tbody>
            {tournament.entries.map((entry) => (
              <tr key={entry.id}>
                <Td className="font-semibold">{personName(entry.user)}</Td>
                <Td>{entry.seed ?? "Unseeded"}</Td>
                <Td>{date(entry.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {tournament.entries.length === 0 && <div className="p-4"><EmptyState message="No tournament entries yet." /></div>}
      </Card>
      <Card>
        <h2 className="mb-4 font-display text-xl font-semibold text-drift-text-primary">Rounds</h2>
        {tournament.rounds.length === 0 && <EmptyState message="No draw rounds have been generated." />}
        <div className="space-y-4">
          {tournament.rounds.map((round) => (
            <div key={round.id} className="rounded-md border border-drift-border p-3">
              <div className="mb-2 font-semibold text-drift-text-primary">Round {round.index}</div>
              <div className="space-y-2 text-sm">
                {round.fixtures.map((fixture) => (
                  <div key={fixture.id} className="flex items-center justify-between gap-3">
                    <span>{personName(fixture.sideA ?? { firstName: null, lastName: null })} vs {fixture.isBye ? "Bye" : personName(fixture.sideB ?? { firstName: null, lastName: null })}</span>
                    {fixture.match && <Badge tone={statusTone(fixture.match.state)}>{label(fixture.match.state)}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LadderPanel({ ladder }: { ladder: LadderDetail & { type: "LADDER" } }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[660px]">
          <thead><tr><Th>Position</Th><Th>Player</Th><Th>Record</Th><Th>Joined</Th></tr></thead>
          <tbody>
            {ladder.entries.map((entry) => (
              <tr key={entry.id}>
                <Td>{entry.position}</Td>
                <Td className="font-semibold">{personName(entry.user)}</Td>
                <Td>{entry.wins}-{entry.losses}</Td>
                <Td>{date(entry.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {ladder.entries.length === 0 && <div className="p-4"><EmptyState message="No ladder entries yet." /></div>}
      </Card>
      <Card>
        <h2 className="mb-4 font-display text-xl font-semibold text-drift-text-primary">Challenges</h2>
        {ladder.challenges.length === 0 && <EmptyState message="No ladder challenges are recorded." />}
        <div className="space-y-3">
          {ladder.challenges.map((challenge) => (
            <div key={challenge.id} className="rounded-md border border-drift-border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-drift-text-primary">{personName(challenge.challenger)} vs {personName(challenge.defender)}</span>
                <Badge tone={statusTone(challenge.state)}>{label(challenge.state)}</Badge>
              </div>
              <div className="mt-1 text-xs text-drift-text-secondary">{date(challenge.createdAt)}{challenge.match ? ` - Match ${label(challenge.match.state)}` : ""}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
