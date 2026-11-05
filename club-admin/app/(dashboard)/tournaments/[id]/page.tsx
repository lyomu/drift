"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, PageHeader, Select, Td, Th } from "@/components/ui";
import { BackButton, ManagementCard } from "@/components/redesign";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { StatusBadge } from "@/components/StatusBadge";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

type Entry = { id: string; seed: number | null; user: { id: string; firstName: string | null; lastName: string | null } };
type Fixture = {
  id: string;
  slotIndex: number;
  isBye: boolean;
  sideA: Entry["user"] | null;
  sideB: Entry["user"] | null;
  match: { id: string; state: string } | null;
};
type TournamentDetail = {
  id: string;
  name: string;
  state: string;
  drawSize: number;
  registrationClosesAt: string;
  entries: Entry[];
  rounds: { id: string; index: number; fixtures: Fixture[] }[];
};

function personName(person: Entry["user"] | null) {
  return person ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() : "";
}

export default function TournamentDrawPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [seeds, setSeeds] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await api.get<{ tournament: TournamentDetail }>(`/clubs/${clubId}/tournaments/${id}`);
      setTournament(res.tournament);
      setSeeds(Object.fromEntries(res.tournament.entries.map((entry, index) => [entry.id, entry.seed ?? index + 1])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.theDrawCouldNotBe"));
    }
  }, [clubId, id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSeeds() {
    if (!clubId || !tournament) return;
    setBusy(true);
    try {
      await api.patch(`/clubs/${clubId}/tournaments/${id}/seeds`, {
        entries: tournament.entries.map((entry) => ({ entryId: entry.id, seed: seeds[entry.id] })),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.seedingCouldNotBeSaved"));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!clubId) return;
    setBusy(true);
    try {
      await api.post(`/clubs/${clubId}/tournaments/${id}/generate-draw`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.drawGenerationFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!tournament) {
    return (
      <div>
        <ErrorBanner message={error} />
        <EmptyState message={t("a.loading")} />
      </div>
    );
  }

  const preDraw = tournament.state === "DRAFT" || tournament.state === "REGISTRATION_OPEN";

  return (
    <div>
      <div className="mb-5">
        <BackButton href="/tournaments">{t("tn.backAll")}</BackButton>
      </div>
      <PageHeader
        eyebrow={t("nav.competitions")}
        title={tournament.name}
        description={t("a.tournamentRegistrationCloses", {
          count: `${tournament.entries.length}/${tournament.drawSize}`,
          date: formatDate(tournament.registrationClosesAt, { dateStyle: "medium", timeStyle: "short" }),
        })}
        action={<StatusBadge status={tournament.state} />}
      />
      <ErrorBanner message={error} />

      {preDraw ? (
        <ManagementCard title={t("a.manualSeeding")} subtitle={t("a.assignEachPlayerAUnique")}>
          {tournament.entries.length === 0 ? (
            <EmptyState bare compact icon="account_tree" title={t("a.generateTheDrawOnceRegistration")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse">
                <thead>
                  <tr>
                    <Th>{t("a.player")}</Th>
                    <Th className="w-[160px]">{t("a.seed")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.entries.map((entry) => {
                    const name = personName(entry.user) || t("a.player");
                    return (
                      <tr key={entry.id} className="transition-colors hover:bg-drift-surface-sunken">
                        <Td>
                          <div className="flex items-center gap-[11px]">
                            <InitialsAvatar name={name} tone="auto" />
                            <strong className="text-[13px] font-bold">{name}</strong>
                          </div>
                        </Td>
                        <Td>
                          <Select
                            disabled={!canManage}
                            value={seeds[entry.id]}
                            onChange={(event) => setSeeds({ ...seeds, [entry.id]: Number(event.target.value) })}
                            className="max-w-28"
                          >
                            {tournament.entries.map((_, index) => (
                              <option key={index + 1} value={index + 1}>
                                {index + 1}
                              </option>
                            ))}
                          </Select>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {canManage && tournament.entries.length >= 2 && (
            <div className="flex flex-wrap gap-3 border-t border-drift-border px-5 py-4">
              <Button variant="secondary" disabled={busy} onClick={() => void saveSeeds()}>
                {t("a.saveSeeding")}
              </Button>
              <Button disabled={busy} onClick={() => void generate()}>
                <MaterialIcon name="auto_awesome" className="text-[18px]" />
                {busy ? t("tn.working") : t("tn.generateDraw")}
              </Button>
            </div>
          )}
        </ManagementCard>
      ) : tournament.rounds.length === 0 ? (
        <EmptyState message={t("a.theBracketIsBeingPrepared")} />
      ) : (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
          {tournament.rounds.map((round) => (
            <ManagementCard key={round.id} title={t("a.roundNumber", { number: round.index })}>
              <div className="flex flex-col gap-2.5 p-4">
                {round.fixtures.map((fixture) => {
                  const a = personName(fixture.sideA) || t("a.toBeDecided");
                  const b = fixture.isBye ? t("a.bye") : personName(fixture.sideB) || t("a.toBeDecided");
                  return (
                    <div key={fixture.id} className="rounded-xl border border-drift-border px-3.5 py-3">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="flex min-w-0 items-center gap-2.5 font-bold text-drift-text-primary">
                          <InitialsAvatar name={a} tone="auto" size={28} />
                          <span className="truncate">{a}</span>
                        </span>
                        {fixture.match && <StatusBadge status={fixture.match.state} />}
                      </div>
                      <div className="my-1.5 pl-[38px] text-[11px] text-drift-text-secondary">{t("a.versus")}</div>
                      <div className="flex items-center gap-2.5 text-[13px] font-bold text-drift-text-primary">
                        <InitialsAvatar name={b} tone="auto" size={28} />
                        <span className="truncate">{b}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ManagementCard>
          ))}
        </div>
      )}
    </div>
  );
}
