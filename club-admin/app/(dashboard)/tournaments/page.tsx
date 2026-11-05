"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, MaterialIcon, ModalShell } from "@/components/dashboard-design";
import { ActionMenu, ManagementCard, SegmentControl } from "@/components/redesign";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  drawSize: number;
  state: string;
  registrationClosesAt: string;
  _count?: { entries: number };
}

type TournamentFilter = "ALL" | "RUNNING" | "REGISTRATION_OPEN" | "DRAFT";

export default function TournamentsPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { clubId } = useClub();
  const [rows, setRows] = useState<Tournament[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drawSize, setDrawSize] = useState(8);
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<TournamentFilter>("ALL");

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      setError(null);
      const res = await api.get<{ tournaments: Tournament[] }>(
        `/clubs/${clubId}/tournaments`,
      );
      setRows(res.tournaments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.failedToLoadTournaments"));
    }
  }, [clubId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId || !name.trim() || !closesAt) return;
    setBusy(true);
    try {
      await api.post(`/clubs/${clubId}/tournaments`, {
        name: name.trim(),
        description: description.trim() || undefined,
        drawSize,
        registrationClosesAt: new Date(closesAt).toISOString(),
      });
      setName("");
      setDescription("");
      setClosesAt("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.createFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function generateDraw(id: string) {
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

  async function cancel(id: string) {
    if (!clubId || !window.confirm(t("a.cancelThisTournament"))) return;
    setBusy(true);
    try {
      await api.patch(`/clubs/${clubId}/tournaments/${id}/cancel`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.cancelFailed"));
    } finally {
      setBusy(false);
    }
  }

  const running = rows?.find((tournament) => tournament.state === "RUNNING") ?? null;
  const visible = useMemo(
    () => (rows ?? []).filter((tournament) => filter === "ALL" || tournament.state === filter),
    [rows, filter],
  );

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.competitions")}
        title={t("a.tournaments")}
        description={t("a.singleEliminationKnockoutDrawsGenerate")}
        action={
          <Button onClick={() => setShowForm(true)}>
            <MaterialIcon name="add" className="text-[19px]" />
            {t("a.newTournament")}
          </Button>
        }
      />
      <ErrorBanner message={error} />

      {rows !== null && running && (
        <section className="relative mb-[18px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#0077cc] to-[#003f73] p-7 text-white shadow-card">
          <div className="relative z-10 max-w-[520px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 text-[11px] font-extrabold uppercase">
              <span className="h-[5px] w-[5px] rounded-full bg-current" />
              {t("tn.liveNow")}
            </span>
            <h2 className="mt-3 font-display text-[26px] font-extrabold leading-tight">{running.name}</h2>
            <p className="mt-1.5 text-[13px] text-white/80">
              {t("tn.liveBlurb", { count: `${running._count?.entries ?? 0}/${running.drawSize}` })}
            </p>
            <Link
              href={`/tournaments/${running.id}`}
              className="mt-4 inline-flex items-center gap-0.5 text-[13px] font-bold text-white hover:underline"
            >
              {t("tn.viewDraw")}
              <MaterialIcon name="chevron_right" className="text-[18px]" />
            </Link>
          </div>
          {/* Draw motif: three rounds of connected boxes. */}
          <div aria-hidden="true" className="absolute bottom-5 right-7 top-5 hidden w-[300px] rounded-xl border border-white/20 bg-white/10 p-4 md:block">
            <div className="flex h-full items-center gap-3">
              <div className="flex flex-1 flex-col gap-3"><i className="h-5 rounded-md bg-white/25" /><i className="h-5 rounded-md bg-white/25" /></div>
              <div className="h-px w-3 bg-white/40" />
              <div className="flex-1"><i className="block h-5 rounded-md bg-white/35" /></div>
              <div className="h-px w-3 bg-white/40" />
              <div className="flex-1"><i className="block h-5 rounded-md bg-white/60" /></div>
            </div>
          </div>
        </section>
      )}

      {rows === null && !error ? (
        <EmptyState message={t("common.loading")} />
      ) : (rows?.length ?? 0) === 0 ? (
        <EmptyState
          icon="grid_view"
          title={t("a.noTournamentsYet")}
          description={t("a.setUpASingleElimination")}
          action={<Button onClick={() => setShowForm(true)}>{t("a.newTournament")}</Button>}
        />
      ) : (
        <ManagementCard
          title={t("tn.all")}
          subtitle={t("tn.count", { count: visible.length })}
          actions={
            <SegmentControl<TournamentFilter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: "ALL", label: t("lg.filterAll") },
                { value: "RUNNING", label: t("tn.filterRunning") },
                { value: "REGISTRATION_OPEN", label: t("tn.filterRegistration") },
                { value: "DRAFT", label: t("lg.filterDraft") },
              ]}
            />
          }
        >
          {visible.length === 0 ? (
            <EmptyState bare icon="account_tree" title={t("tn.noMatches")} />
          ) : (
            <div className="flex flex-col gap-2.5 p-3">
              {visible.map((tournament) => (
            <div
              key={tournament.id}
              className="flex flex-wrap items-center gap-4 rounded-[14px] border border-drift-border bg-drift-surface px-5 py-4 transition-colors hover:bg-drift-surface-sunken"
            >
              <IconChip icon="account_tree" tone="lime" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-extrabold text-drift-text-primary">
                    {tournament.name}
                  </span>
                  <StatusBadge status={tournament.state} />
                </div>
                <div className="mt-1 text-[12px] text-drift-text-secondary">
                  {t("tn.entriesCloses", {
                    count: `${tournament._count?.entries ?? 0}/${tournament.drawSize}`,
                    date: formatDate(tournament.registrationClosesAt),
                  })}
                </div>
                <div className="mt-2 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-drift-neutral-surface">
                  <div
                    className="h-full rounded-full bg-drift-primary"
                    style={{ width: `${Math.min(100, ((tournament._count?.entries ?? 0) / tournament.drawSize) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/tournaments/${tournament.id}`}>
                  <Button variant="secondary" size="sm">{t("a.manageDraw")}</Button>
                </Link>
                {tournament.state !== "COMPLETED" && tournament.state !== "CANCELLED" && (
                  <ActionMenu
                    label={t("tn.moreActions", { name: tournament.name })}
                    items={[
                      ...(tournament.state === "REGISTRATION_OPEN" || tournament.state === "DRAFT"
                        ? [
                            {
                              icon: "auto_awesome",
                              label: t("tn.generateDraw"),
                              disabled: busy,
                              onSelect: () => void generateDraw(tournament.id),
                            },
                            { divider: true as const },
                          ]
                        : []),
                      {
                        icon: "cancel",
                        label: t("tn.cancelTournament"),
                        danger: true,
                        disabled: busy,
                        onSelect: () => void cancel(tournament.id),
                      },
                    ]}
                  />
                )}
              </div>
            </div>
              ))}
            </div>
          )}
        </ManagementCard>
      )}

      {showForm && (
        <ModalShell title={t("a.newTournament")} onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="flex flex-col gap-4">
            <Field label={t("a.name")}>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("a.description")}>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("a.drawSize")}>
                <Select value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))}>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </Select>
              </Field>
              <Field label={t("a.registrationCloses")}>
                <Input
                  type="datetime-local"
                  required
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                {t("a.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? t("a.creating") : t("a.createTournament")}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
