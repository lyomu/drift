"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button, EmptyState, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { InlineSearch, SegmentControl } from "@/components/redesign";
import { InitialsAvatar, MaterialIcon, ModalActions, ModalShell } from "@/components/dashboard-design";
import type { Fixture, Member, RoundSummary } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

// ---------------------------------------------------------------- rounds

/** Round pills: Complete / Current / Upcoming, from `GET /leagues/:id/rounds`. */
export function RoundSelector({
  rounds,
  selectedId,
  onSelect,
}: {
  rounds: RoundSummary[];
  selectedId: string | null;
  onSelect: (roundId: string) => void;
}) {
  const t = useT();
  const { formatDate } = useI18n();
  // The current round is the latest one that has opened and not yet closed.
  const currentId = [...rounds].reverse().find((r) => r.openedAt && !r.closedAt)?.id ?? null;

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-drift-border px-4 py-3">
      {rounds.map((round) => {
        const active = round.id === selectedId;
        const label = round.closedAt
          ? t("lw.complete")
          : round.id === currentId
            ? t("lw.current")
            : t("lw.upcoming");
        return (
          <button
            key={round.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(round.id)}
            title={t("lw.roundDeadline", { date: formatDate(round.deadline, { month: "short", day: "numeric" }) })}
            className={`flex min-w-[92px] shrink-0 flex-col items-start rounded-xl border px-3.5 py-2 text-left transition-colors ${
              active
                ? "border-drift-primary bg-drift-primary-light"
                : "border-drift-border bg-drift-surface hover:bg-drift-surface-sunken"
            }`}
          >
            <span className="text-[12px] font-extrabold text-drift-text-primary">
              {t("ld.round", { n: round.index })}
            </span>
            <span className="mt-0.5 text-[11px] text-drift-text-secondary">
              {label}
              {round.fixtureCount > 0 && ` · ${round.playedCount}/${round.fixtureCount}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- result

type Outcome = "SCORE" | "RETIREMENT" | "WALKOVER";
type SetRow = { a: string; b: string };

/**
 * Record a league result on the players' behalf (`POST /fixtures/:id/result`).
 * The server decides the winner from a score; only a retirement or a walkover
 * needs the admin to say who won (a walkover may be "neither").
 */
export function AddResultModal({
  fixture,
  nameA,
  nameB,
  onClose,
  onSaved,
}: {
  fixture: Fixture;
  nameA: string;
  nameB: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useT();
  const [outcome, setOutcome] = useState<Outcome>("SCORE");
  const [sets, setSets] = useState<SetRow[]>([{ a: "", b: "" }]);
  const [winner, setWinner] = useState<"" | "A" | "B">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (index: number, key: "a" | "b", value: string) =>
    setSets((current) => current.map((row, i) => (i === index ? { ...row, [key]: value.replace(/[^0-9]/g, "").slice(0, 2) } : row)));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    let body: Record<string, unknown>;
    if (outcome === "SCORE") {
      const filled = sets.filter((row) => row.a !== "" || row.b !== "");
      if (filled.length === 0 || filled.some((row) => row.a === "" || row.b === "")) {
        setError(t("lw.scoreIncomplete"));
        return;
      }
      body = {
        outcome,
        sets: filled.map((row) => ({ sideAGames: Number(row.a), sideBGames: Number(row.b) })),
      };
    } else {
      if (outcome === "RETIREMENT" && !winner) {
        setError(t("lw.chooseWinner"));
        return;
      }
      body = { outcome, ...(winner ? { winningSide: winner } : {}) };
    }

    setBusy(true);
    try {
      await api.post(`/fixtures/${fixture.id}/result`, body);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={t("lw.recordResult")} description={`${nameA} ${t("ld.vs")} ${nameB}`} icon="scoreboard" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <SegmentControl<Outcome>
          label={t("lw.outcome")}
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: "SCORE", label: t("lw.outcomeScore") },
            { value: "RETIREMENT", label: t("lw.outcomeRetirement") },
            { value: "WALKOVER", label: t("lw.outcomeWalkover") },
          ]}
        />

        {outcome === "SCORE" ? (
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-[56px_1fr_1fr] items-center gap-2 text-[11px] font-bold text-drift-text-secondary">
              <span />
              <span className="truncate">{nameA}</span>
              <span className="truncate">{nameB}</span>
            </div>
            {sets.map((row, index) => (
              <div key={index} className="grid grid-cols-[56px_1fr_1fr] items-center gap-2">
                <span className="text-[12px] font-bold text-drift-text-secondary">{t("lw.setNumber", { n: index + 1 })}</span>
                <Input inputMode="numeric" aria-label={`${t("lw.setNumber", { n: index + 1 })} ${nameA}`} value={row.a} onChange={(e) => setValue(index, "a", e.target.value)} />
                <Input inputMode="numeric" aria-label={`${t("lw.setNumber", { n: index + 1 })} ${nameB}`} value={row.b} onChange={(e) => setValue(index, "b", e.target.value)} />
              </div>
            ))}
            <div className="flex gap-2">
              {sets.length < 5 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSets((c) => [...c, { a: "", b: "" }])}>
                  <MaterialIcon name="add" className="text-[16px]" />
                  {t("lw.addSet")}
                </Button>
              )}
              {sets.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSets((c) => c.slice(0, -1))}>
                  {t("lw.removeSet")}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-drift-text-secondary">{t("lw.scoreHint")}</p>
          </div>
        ) : (
          <Field label={outcome === "RETIREMENT" ? t("lw.whoWon") : t("lw.walkoverWinner")}>
            <Select value={winner} onChange={(e) => setWinner(e.target.value as "" | "A" | "B")}>
              {outcome === "WALKOVER" && <option value="">{t("lw.neither")}</option>}
              {outcome === "RETIREMENT" && <option value="">{t("lw.selectWinner")}</option>}
              <option value="A">{nameA}</option>
              <option value="B">{nameB}</option>
            </Select>
          </Field>
        )}

        <p className="text-[11px] leading-[1.5] text-drift-text-secondary">{t("lw.recordHint")}</p>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? t("common.saving") : t("lw.saveResult")}
          </Button>
        </ModalActions>
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------- registration

type Entry = "ENROLLED" | "WAITLISTED";

/**
 * Add club members to a league (`POST /leagues/:id/registrations`). Only active
 * members not already registered are offered; the server re-checks all of it,
 * including capacity, so a refusal for one person is shown without losing the rest.
 */
export function AddRegistrationModal({
  leagueId,
  clubId,
  registeredUserIds,
  onClose,
  onSaved,
}: {
  leagueId: string;
  clubId: string;
  registeredUserIds: string[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useT();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [entry, setEntry] = useState<Entry>("ENROLLED");
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ members: Member[] }>(`/clubs/${clubId}/members`)
      .then((res) => setMembers(res.members))
      .catch((err) => {
        setMembers([]);
        setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
      });
  }, [clubId, t]);

  const nameOf = (m: Member) => `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email;
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => m.status === "ACTIVE" && !registeredUserIds.includes(m.userId))
      .filter((m) => !q || `${nameOf(m)} ${m.email}`.toLowerCase().includes(q));
  }, [members, registeredUserIds, query]);

  async function submit() {
    setBusy(true);
    setError(null);
    const failed: { name: string; reason: string }[] = [];
    for (const userId of selected) {
      const member = members?.find((m) => m.userId === userId);
      try {
        await api.post(`/leagues/${leagueId}/registrations`, { userId, status: entry });
      } catch (err) {
        failed.push({
          name: member ? nameOf(member) : userId,
          reason: err instanceof ApiError ? err.message : t("a.somethingWentWrong"),
        });
      }
    }
    setBusy(false);
    await onSaved();
    if (failed.length === 0) {
      onClose();
    } else {
      // Keep the modal open on the people who could not be added.
      setFailures(failed);
      setSelected([]);
    }
  }

  return (
    <ModalShell title={t("lw.addRegistrations")} description={t("lw.addRegistrationsHint")} icon="group_add" size="lg" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        {failures.length > 0 && (
          <div className="rounded-[9px] border border-drift-error/30 bg-drift-error-surface px-3.5 py-3 text-[12px] text-drift-error" role="alert">
            <strong className="block font-bold">{t("lw.someFailed")}</strong>
            {failures.map((f) => (
              <div key={f.name}>
                {f.name}: {f.reason}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <InlineSearch value={query} onChange={setQuery} placeholder={t("lw.searchMembers")} className="min-w-[200px] flex-1" />
          <SegmentControl<Entry>
            label={t("lw.entryType")}
            value={entry}
            onChange={setEntry}
            options={[
              { value: "ENROLLED", label: t("lw.enrol") },
              { value: "WAITLISTED", label: t("lw.waitlist") },
            ]}
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-drift-border">
          {members === null ? (
            <EmptyState bare compact message={t("common.loading")} />
          ) : candidates.length === 0 ? (
            <EmptyState bare compact icon="group_off" title={t("lw.noCandidates")} />
          ) : (
            candidates.map((m) => {
              const on = selected.includes(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected((c) => (on ? c.filter((id) => id !== m.userId) : [...c, m.userId]))}
                  className={`flex w-full items-center gap-3 border-b border-drift-border px-3.5 py-2.5 text-left last:border-b-0 ${
                    on ? "bg-drift-primary-light" : "hover:bg-drift-surface-sunken"
                  }`}
                >
                  <InitialsAvatar name={nameOf(m)} tone="auto" size={32} />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[13px] font-bold text-drift-text-primary">{nameOf(m)}</strong>
                    <small className="block truncate text-[11px] text-drift-text-secondary">{m.email}</small>
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      on ? "border-drift-primary bg-drift-primary text-white" : "border-drift-border"
                    }`}
                  >
                    {on && <MaterialIcon name="check" className="text-[14px]" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <ModalActions>
          <span className="mr-auto self-center text-[12px] text-drift-text-secondary">
            {t("lw.selectedCount", { count: selected.length })}
          </span>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={busy || selected.length === 0} onClick={() => void submit()}>
            {busy ? t("common.saving") : t("lw.addSelected")}
          </Button>
        </ModalActions>
      </div>
    </ModalShell>
  );
}
