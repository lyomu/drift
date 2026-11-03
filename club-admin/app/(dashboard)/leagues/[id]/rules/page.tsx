"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { LeagueSummary } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

export default function LeagueRulesPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<LeagueSummary | null>(null);
  const [form, setForm] = useState({
    scoringFormat: "",
    walkoverRule: "",
    unfinishedMatchPolicy: "",
    rulesText: "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
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
    setSaved(false);
    try {
      await api.patch(`/leagues/${id}`, form);
      setSaved(true);
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
    <div>
      <PageHeader
        title={t("a.rulesScoring")}
        description={`${league.name} · Changes apply to future fixtures and admin rulings.`}
      />
      <ErrorBanner message={error} />
      <Card>
        <form onSubmit={save} className="flex flex-col gap-5">
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
          <Field label={t("a.additionalLeagueRules")}>
            <RichTextEditor
              value={form.rulesText}
              onChange={(html) => setForm({ ...form, rulesText: html })}
              placeholder={t("a.formatConductSchedulingWindowsTie")}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? t("common.saving") : t("a.saveRules")}
            </Button>
            {saved && (
              <span className="text-[13px] font-semibold text-drift-success">{t("a.saved")}</span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
