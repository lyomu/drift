"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import type {
  RoundDto,
  SeasonDetail,
  SeasonRegistrationStatus,
  StandingRow,
} from "@/lib/types";

type RegisteredPlayer = {
  registrationId: string;
  status: SeasonRegistrationStatus;
  player: { id: string; firstName: string | null; lastName: string | null } | null;
};

const TABS = ["Registrations", "Fixtures", "Standings"] as const;
type Tab = (typeof TABS)[number];

export default function SeasonDetailPage() {
  const { seasonId } = useParams<{ id: string; seasonId: string }>();
  const { role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const [tab, setTab] = useState<Tab>("Registrations");
  const [season, setSeason] = useState<SeasonDetail | null>(null);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [round, setRound] = useState<RoundDto | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function loadAll() {
    const [seasonRes, playersRes] = await Promise.all([
      api.get<SeasonDetail>(`/seasons/${seasonId}`),
      api.get<{ players: RegisteredPlayer[] }>(
        `/seasons/${seasonId}/registrations`,
      ),
    ]);
    setSeason(seasonRes);
    setPlayers(playersRes.players);
    setLoading(false);
  }

  async function loadRound() {
    const res = await api.get<{ round: RoundDto | null }>(
      `/seasons/${seasonId}/rounds/current`,
    );
    setRound(res.round);
  }

  async function loadStandings() {
    const res = await api.get<{ standings: StandingRow[] }>(
      `/seasons/${seasonId}/standings`,
    );
    setStandings(res.standings);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "Fixtures") loadRound();
    if (tab === "Standings") loadStandings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, seasonId]);

  async function handleRegistrationUpdate(
    registrationId: string,
    status: SeasonRegistrationStatus,
  ) {
    setError(null);
    try {
      await api.patch(`/seasons/${seasonId}/registrations/${registrationId}`, {
        status,
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleGenerateFixtures() {
    setError(null);
    setGenerating(true);
    try {
      await api.post(`/seasons/${seasonId}/generate-fixtures`);
      await loadRound();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading || !season) {
    return <p className="text-sm text-drift-text-secondary">Loading…</p>;
  }

  return (
    <div>
      <PageHeader
        title={season.label}
        description={`${season.leagueName} · ${season.enrolledCount} enrolled${season.capacity ? ` / ${season.capacity} capacity` : ""}`}
        action={<StatusBadge status={season.state} />}
      />
      <ErrorBanner message={error} />

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
            <p className="text-sm text-drift-text-secondary">
              No round open yet.
            </p>
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
            {
              header: "Prev. rank",
              cell: (s) => s.previousRank ?? "—",
            },
          ]}
        />
      )}
    </div>
  );
}
