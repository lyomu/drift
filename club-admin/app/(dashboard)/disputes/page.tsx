"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";
import { IconChip, MaterialIcon } from "@/components/dashboard-design";
import { StatusBadge } from "@/components/StatusBadge";
import type { Dispute } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

export default function DisputesPage() {
  const t = useT();
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ disputes: Dispute[] }>(
      `/clubs/${clubId}/disputes`,
    );
    setDisputes(res.disputes);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleResolve(
    fixtureId: string,
    ruling: "SUBMITTED" | "DISPUTANT",
  ) {
    setError(null);
    setResolving(fixtureId);
    try {
      await api.patch(`/disputes/${fixtureId}/resolve`, { ruling });
      setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setResolving(null);
    }
  }

  function name(p: Dispute["sideA"]) {
    return p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || t("a.player") : "-";
  }

  function winner(dispute: Dispute, side: "submitted" | "disputant") {
    const result = dispute.match?.result;
    const winningSide =
      side === "submitted" ? result?.winningSide : result?.disputantWinningSide;
    if (winningSide === "A") return t("dsp.won", { name: name(dispute.sideA) });
    if (winningSide === "B") return t("dsp.won", { name: name(dispute.sideB) });
    return t("dsp.noWinner");
  }

  const selected = disputes.find((d) => d.fixtureId === selectedId) ?? disputes[0] ?? null;

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.operations")}
        title={t("a.disputes")}
        description={t("a.resultDisputesAwaitingARuling")}
      />
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message={t("a.loading")} />
      ) : disputes.length === 0 ? (
        <EmptyState icon="gavel" title={t("a.noOpenDisputes")} description={t("a.whenAPlayerContestsA")} />
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
            <section className="overflow-hidden rounded-2xl border border-drift-border bg-drift-surface shadow-card">
              <div className="border-b border-drift-border px-5 py-4">
                <h2 className="text-[14px] font-extrabold text-drift-text-primary">{t("dsp.queue")}</h2>
                <p className="mt-[3px] text-[11px] text-drift-text-secondary">
                  {t("dsp.queueCount", { count: disputes.length })}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 p-2.5">
                {disputes.map((dispute, index) => {
                  const active = dispute.fixtureId === selected?.fixtureId;
                  return (
                    <button
                      key={dispute.fixtureId}
                      type="button"
                      onClick={() => setSelectedId(dispute.fixtureId)}
                      aria-pressed={active}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        active
                          ? "border-drift-primary/30 bg-drift-primary-light"
                          : "border-transparent hover:bg-drift-surface-sunken"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-drift-text-secondary">
                          #{String(index + 1).padStart(3, "0")}
                        </span>
                        <div className="mt-1">
                          <StatusBadge status="OPEN" />
                        </div>
                        <strong className="mt-1.5 block truncate text-[13px] font-bold text-drift-text-primary">
                          {name(dispute.sideA)} {t("ld.vs")} {name(dispute.sideB)}
                        </strong>
                      </div>
                      <MaterialIcon name="chevron_right" className="text-[18px] text-drift-text-secondary" />
                    </button>
                  );
                })}
              </div>
            </section>

            {selected && (
              <section className="overflow-hidden rounded-2xl border border-drift-border bg-drift-surface shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-drift-border px-6 py-5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <IconChip icon="gavel" tone="coral" />
                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-extrabold text-drift-text-primary">
                        {name(selected.sideA)} {t("ld.vs")} {name(selected.sideB)}
                      </h2>
                      <p className="mt-0.5 text-[12px] text-drift-text-secondary">{t("a.resultDisputeAwaitingAnAdmin")}</p>
                    </div>
                  </div>
                  <StatusBadge status="OPEN" />
                </div>

                <div className="grid grid-cols-1 items-stretch gap-3 p-6 md:grid-cols-[1fr_auto_1fr]">
                  <div className="rounded-xl border border-drift-border bg-drift-surface-sunken px-5 py-4">
                    <div className="text-[11px] font-bold uppercase text-drift-text-secondary">{t("a.originalSubmission")}</div>
                    <div className="mt-2 text-[14px] font-bold text-drift-text-primary">{winner(selected, "submitted")}</div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center self-center rounded-full border border-drift-border bg-drift-surface text-[11px] font-bold text-drift-text-secondary">
                    {t("ld.vs")}
                  </span>
                  <div className="rounded-xl border border-drift-warning/25 bg-drift-warning-surface px-5 py-4">
                    <div className="text-[11px] font-bold uppercase text-drift-warning">{t("a.disputantClaims")}</div>
                    <div className="mt-2 text-[14px] font-bold text-drift-text-primary">{winner(selected, "disputant")}</div>
                  </div>
                </div>

                {canManage && (
                  <div className="m-6 mt-0 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-drift-surface-sunken px-5 py-4">
                    <div>
                      <strong className="block text-[13px] font-bold text-drift-text-primary">{t("dsp.readyToRule")}</strong>
                      <p className="mt-0.5 text-[11px] text-drift-text-secondary">{t("dsp.readyHint")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <Button
                        variant="secondary"
                        disabled={resolving === selected.fixtureId}
                        onClick={() => void handleResolve(selected.fixtureId, "SUBMITTED")}
                      >
                        <MaterialIcon name="check" className="text-[18px]" />
                        {t("dsp.uphold")}
                      </Button>
                      <Button
                        disabled={resolving === selected.fixtureId}
                        onClick={() => void handleResolve(selected.fixtureId, "DISPUTANT")}
                      >
                        {t("dsp.sideWith")}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
