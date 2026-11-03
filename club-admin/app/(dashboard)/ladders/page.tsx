"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { MaterialIcon, ModalShell, Panel } from "@/components/dashboard-design";
import { Listing } from "@/components/Listing";
import type { LadderAdmin, MatchSport } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

export default function LaddersPage() {
  const t = useT();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [ladders, setLadders] = useState<LadderAdmin[] | null>(null);
  const [selected, setSelected] = useState<LadderAdmin | null>(null);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<MatchSport>("TENNIS");
  const [range, setRange] = useState("2");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const response = await api.get<{ ladders: LadderAdmin[] }>(
        `/clubs/${clubId}/ladders`,
      );
      setLadders(response.ladders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.laddersCouldNotBeLoaded"));
    }
  }, [clubId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    try {
      await api.post(`/clubs/${clubId}/ladders`, {
        name,
        sport,
        challengeRange: Number(range),
      });
      setName("");
      setSport("TENNIS");
      setRange("2");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.theLadderCouldNotBe"));
    }
  }

  async function open(id: string) {
    if (!clubId) return;
    try {
      const res = await api.get<{ ladder: LadderAdmin }>(
        `/clubs/${clubId}/ladders/${id}`,
      );
      setSelected(res.ladder);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.theLadderCouldNotBe2"));
    }
  }

  function move(index: number, direction: -1 | 1) {
    if (!selected?.entries) return;
    const next = [...selected.entries];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelected({
      ...selected,
      entries: next.map((entry, i) => ({ ...entry, position: i + 1 })),
    });
  }

  async function saveOrder() {
    if (!clubId || !selected?.entries) return;
    try {
      await api.patch(`/clubs/${clubId}/ladders/${selected.id}/positions`, {
        entries: selected.entries.map((entry) => ({
          entryId: entry.id,
          position: entry.position,
        })),
      });
      await open(selected.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.positionsCouldNotBeSaved"));
    }
  }

  async function archive() {
    if (!clubId || !selected) return;
    try {
      await api.patch(`/clubs/${clubId}/ladders/${selected.id}/archive`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.theLadderCouldNotBe3"));
    }
  }

  return (
    <div>
      <PageHeader
        title={t("a.ladderManagement")}
        description={t("a.createRollingLaddersAndAdjust")}
        action={
          canManage ? (
            <Button onClick={() => setShowForm(true)}>{t("a.createLadder")}</Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
        <Listing
          title={t("a.ladders")}
          count={ladders?.length ?? null}
          loading={ladders === null}
          empty={{
            icon: "leaderboard",
            title: t("a.noLaddersYet"),
            description: t("a.aLadderIsARolling"),
            action: canManage ? (
              <Button onClick={() => setShowForm(true)}>{t("a.createLadder")}</Button>
            ) : undefined,
          }}
        >
          {ladders?.map((ladder) => (
            <button
              type="button"
              key={ladder.id}
              onClick={() => void open(ladder.id)}
              className={`rowcard rounded-lg border bg-drift-surface p-4 text-left transition-colors ${
                selected?.id === ladder.id ? "border-drift-primary" : "border-drift-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-drift-text-primary">
                  {ladder.name}
                </span>
                <StatusBadge status={ladder.state} />
              </div>
              <div className="mt-1 text-[12.5px] text-drift-text-secondary">
                {(ladder.sport ?? "TENNIS").replace(/_/g, " ")} / {ladder._count?.entries ?? 0} players / challenge {ladder.challengeRange} rungs
              </div>
            </button>
          ))}
        </Listing>
        <div>
            {!selected ? (
              <EmptyState
                icon="ads_click"
                title={t("a.noLadderSelected")}
                description={t("a.chooseALadderOnThe")}
              />
            ) : (
              <Panel>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-drift-text-primary">
                      {selected.name}
                    </h2>
                    <p className="mt-0.5 text-[12.5px] text-drift-text-secondary">{t("a.rung1IsTheTop")}</p>
                  </div>
                  {canManage && (
                    <Button variant="ghost" onClick={() => void archive()}>
                      {t("a.archive")}
                    </Button>
                  )}
                </div>
                {!selected.entries?.length ? (
                  <EmptyState
                    bare
                    compact
                    icon="group_add"
                    title={t("a.noPlayersOnThisLadder")}
                    description={t("a.membersJoinALadderFrom")}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-md border border-drift-border px-3 py-2.5"
                      >
                        <span className="w-7 shrink-0 text-center text-base font-extrabold text-drift-primary tabular">
                          {entry.position}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold text-drift-text-primary">
                            {`${entry.user.firstName ?? ""} ${entry.user.lastName ?? ""}`.trim() || "Player"}
                          </div>
                          <div className="text-xs text-drift-text-secondary">
                            {entry.wins} wins / {entry.losses} losses
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => move(index, -1)}
                              aria-label={t("a.moveUp")}
                              className="text-drift-text-secondary disabled:opacity-30"
                            >
                              <MaterialIcon name="arrow_upward" className="text-lg" />
                            </button>
                            <button
                              type="button"
                              disabled={index === selected.entries!.length - 1}
                              onClick={() => move(index, 1)}
                              aria-label={t("a.moveDown")}
                              className="text-drift-text-secondary disabled:opacity-30"
                            >
                              <MaterialIcon name="arrow_downward" className="text-lg" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {canManage && (
                      <Button onClick={() => void saveOrder()} className="mt-3 self-start">
                        {t("a.savePositions")}
                      </Button>
                    )}
                  </div>
                )}
              </Panel>
            )}
        </div>
      </div>

      {showForm && (
        <ModalShell title={t("a.createLadder")} onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="flex flex-col gap-4">
            <Field label={t("a.ladderName")}>
              <Input
                required
                placeholder={t("a.eGClubSinglesLadder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t("a.sport")}>
              <Select
                value={sport}
                onChange={(e) => setSport(e.target.value as MatchSport)}
              >
                <option value="TENNIS">{t("a.tennis")}</option>
                <option value="PADEL">{t("a.padel")}</option>
              </Select>
            </Field>
            <Field label={t("a.challengeRangeRungs")}>
              <Input
                type="number"
                min={1}
                max={10}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
            </Field>
            <p className="-mt-1 text-[12px] leading-4 text-drift-text-secondary">
              {t("a.howManyPositionsAboveThemselves")}
            </p>
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                {t("a.cancel")}
              </Button>
              <Button type="submit">{t("a.createLadder")}</Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
