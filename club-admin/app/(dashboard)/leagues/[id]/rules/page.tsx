"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { BackButton } from "@/components/redesign";
import { MaterialIcon, TONE_CLASSES, type Tone } from "@/components/dashboard-design";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useToast } from "@/components/Toast";
import type { LeagueSummary } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

export default function LeagueRulesPage() {
  const t = useT();
  const { notify } = useToast();
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<LeagueSummary | null>(null);
  const [form, setForm] = useState({
    scoringFormat: "",
    walkoverRule: "",
    unfinishedMatchPolicy: "",
    rulesText: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<LeagueSummary>(`/leagues/${id}`)
      .then((value) => {
        setLeague(value);
        setForm({
          scoringFormat: value.scoringFormat ?? "",
          walkoverRule: value.walkoverRule ?? "",
          unfinishedMatchPolicy: value.unfinishedMatchPolicy ?? "",
          rulesText: value.rulesText ?? "",
        });
      })
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : t("a.leagueRulesCouldNotBe"),
        ),
      );
  }, [id, t]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/leagues/${id}`, form);
      notify(t("a.saved"));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("a.rulesCouldNotBeSaved"),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!league) {
    return (
      <div>
        <ErrorBanner message={error} />
        <EmptyState message={t("a.loading")} />
      </div>
    );
  }

  return (
    <form onSubmit={save}>
      <div className="mb-5">
        <BackButton href={`/leagues/${id}`}>{t("rules.backToLeague")}</BackButton>
      </div>
      <PageHeader
        eyebrow={league.name}
        title={t("a.rulesScoring")}
        description={t("rules.changesApply")}
        action={
          <Button type="submit" disabled={busy}>
            {busy ? t("common.saving") : t("a.saveRules")}
          </Button>
        }
      />
      <ErrorBanner message={error} />

      <div className="flex flex-col gap-[18px]">
        <RulesCard
          icon="emoji_events"
          tone="primary"
          title={t("rules.formatTitle")}
          hint={t("rules.formatHint")}
        >
          <Field label={t("a.scoringFormat")}>
            <Input
              required
              placeholder={t("a.bestOf3SetsMatch")}
              value={form.scoringFormat}
              onChange={(e) =>
                setForm({ ...form, scoringFormat: e.target.value })
              }
            />
          </Field>
        </RulesCard>

        <RulesCard
          icon="shield"
          tone="gold"
          title={t("rules.policiesTitle")}
          hint={t("rules.policiesHint")}
        >
          <div className="flex flex-col gap-4">
            <Field label={t("a.walkoverRules")}>
              <Textarea
                rows={3}
                required
                value={form.walkoverRule}
                onChange={(e) =>
                  setForm({ ...form, walkoverRule: e.target.value })
                }
              />
            </Field>
            <Field label={t("a.unfinishedMatchPolicy")}>
              <Textarea
                rows={3}
                required
                value={form.unfinishedMatchPolicy}
                onChange={(e) =>
                  setForm({ ...form, unfinishedMatchPolicy: e.target.value })
                }
              />
            </Field>
          </div>
        </RulesCard>

        <RulesCard
          icon="edit_note"
          tone="lime"
          title={t("rules.playerFacingTitle")}
          hint={t("rules.playerFacingHint")}
        >
          <Field label={t("a.additionalLeagueRules")}>
            <RichTextEditor
              value={form.rulesText}
              onChange={(html) => setForm({ ...form, rulesText: html })}
              placeholder={t("a.formatConductSchedulingWindowsTie")}
            />
          </Field>
        </RulesCard>
      </div>
    </form>
  );
}

function RulesCard({
  icon,
  tone,
  title,
  hint,
  children,
}: {
  icon: string;
  tone: Tone;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-drift-border bg-drift-surface shadow-card">
      <div className="flex items-center gap-3 border-b border-drift-border px-5 py-4">
        <span
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${TONE_CLASSES[tone]}`}
        >
          <MaterialIcon name={icon} className="text-[19px]" />
        </span>
        <div>
          <h2 className="text-[14px] font-extrabold text-drift-text-primary">{title}</h2>
          <p className="mt-[3px] text-[11px] text-drift-text-secondary">{hint}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
