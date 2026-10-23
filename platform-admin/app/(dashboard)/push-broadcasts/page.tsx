"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalShell } from "@/components/dashboard-design";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { dateTime } from "@/lib/support-types";
import type {
  PushBroadcastCountry,
  PushBroadcastRow,
} from "@/lib/push-broadcast-types";
import { countryLabel } from "@/lib/push-broadcast-types";

type ComposeForm = {
  title: string;
  body: string;
  country: string;
  audience: string[];
  scheduledFor: string;
};

const EMPTY_COMPOSE: ComposeForm = {
  title: "",
  body: "",
  country: "",
  audience: [],
  scheduledFor: "",
};

/**
 * Push notifications sent from the platform to app users. A send reaches
 * real devices and cannot be undone, so the compose modal always shows the
 * live recipient count for the current country filter before the button can
 * be pressed, and every send lands in the history below — mirrors the
 * Launch Waitlist email broadcast's deliberate, no-silent-resend pattern.
 */
export default function PushBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<PushBroadcastRow[]>([]);
  const [countries, setCountries] = useState<PushBroadcastCountry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState<ComposeForm>(EMPTY_COMPOSE);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [poster, setPoster] = useState<File | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const overview = await api.get<{
        broadcasts: PushBroadcastRow[];
        countries: PushBroadcastCountry[];
      }>("/push-broadcasts");
      setBroadcasts(overview.broadcasts);
      setCountries(overview.countries);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Broadcast history could not be loaded.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showCompose) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (compose.country) params.set("country", compose.country);
    for (const audience of compose.audience)
      params.append("audience", audience);
    api
      .get<{ recipientCount: number }>(
        `/push-broadcasts/count?${params.toString()}`,
      )
      .then((res) => {
        if (!cancelled) setRecipientCount(res.recipientCount);
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showCompose, compose.country, compose.audience]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: compose.title,
        body: compose.body,
        country: compose.country || null,
        audience: compose.audience,
        scheduledFor: compose.scheduledFor
          ? new Date(compose.scheduledFor).toISOString()
          : undefined,
      };
      const result = poster
        ? await (() => {
            const form = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
              if (value !== undefined && value !== null)
                form.append(
                  key,
                  Array.isArray(value) ? JSON.stringify(value) : String(value),
                );
            });
            form.append("image", poster);
            return api.upload<{
              recipientCount: number;
              deliveredCount: number;
              skippedCount: number;
              status: string;
            }>("/push-broadcasts", form);
          })()
        : await api.post<{
            recipientCount: number;
            deliveredCount: number;
            skippedCount: number;
            status: string;
          }>("/push-broadcasts", payload);
      setShowCompose(false);
      setCompose(EMPTY_COMPOSE);
      setPoster(null);
      setNotice(
        result.status === "SCHEDULED"
          ? `Scheduled for ${new Date(payload.scheduledFor!).toLocaleString()}.`
          : `Sent to ${result.deliveredCount} of ${result.recipientCount} targeted user(s)` +
              (result.skippedCount > 0
                ? `; ${result.skippedCount} had announcements turned off.`
                : "."),
      );
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The broadcast could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Push Broadcasts"
        description="Compose a visual announcement for immediate delivery or schedule it for a precisely targeted audience. Each recipient's Announcements preference still applies."
        action={
          <Button icon="campaign" onClick={() => setShowCompose(true)}>
            New broadcast
          </Button>
        }
      />

      <ErrorBanner message={error} />
      {notice && (
        <div className="mb-4 rounded-lg border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm font-semibold text-drift-success">
          {notice}
        </div>
      )}

      <h2 className="mb-3 text-[16px] font-bold text-drift-text-primary">
        Broadcast history
      </h2>
      {broadcasts.length === 0 ? (
        <Card>
          <EmptyState
            icon="campaign"
            message="No broadcasts sent yet."
            description="Every push broadcast is recorded here, with its recipient and delivery counts."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-drift-text-primary">
                    {broadcast.title}
                  </div>
                  <div className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-drift-text-secondary">
                    {broadcast.body}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="neutral">
                    {countryLabel(broadcast.country, countries)}
                  </Badge>
                  <Badge tone="neutral">
                    {broadcast.audience.length
                      ? broadcast.audience
                          .map((value) =>
                            value.replaceAll("_", " ").toLowerCase(),
                          )
                          .join(", ")
                      : "All users"}
                  </Badge>
                  <Badge
                    tone={
                      broadcast.status === "SENT"
                        ? "success"
                        : broadcast.status === "FAILED"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {broadcast.status.toLowerCase()}
                  </Badge>
                  <Badge
                    tone={broadcast.skippedCount === 0 ? "success" : "warning"}
                  >
                    {broadcast.deliveredCount}/{broadcast.recipientCount}{" "}
                    delivered
                  </Badge>
                </div>
              </div>
              <div className="mt-2 text-xs text-drift-text-secondary">
                {broadcast.imageUrl && (
                  <span className="mr-2 inline-flex h-5 items-center rounded bg-drift-primary-light px-1.5 text-drift-primary">
                    Poster
                  </span>
                )}
                {broadcast.status === "SCHEDULED" && broadcast.scheduledFor
                  ? `Scheduled for ${dateTime(broadcast.scheduledFor)} · `
                  : ""}
                Sent by {broadcast.sentBy.name || broadcast.sentBy.email} ·{" "}
                {dateTime(broadcast.createdAt)}
                {broadcast.skippedCount > 0
                  ? ` · ${broadcast.skippedCount} opted out`
                  : ""}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCompose && (
        <ModalShell
          title="Compose a push broadcast"
          description={
            recipientCount === null
              ? "Loading recipient count…"
              : `${compose.scheduledFor ? "Scheduled delivery" : "Immediate delivery"} reaches ${recipientCount} user(s): ${countryLabel(compose.country || null, countries)}.`
          }
          onClose={() => setShowCompose(false)}
        >
          <form onSubmit={send} className="flex flex-col gap-4">
            <Field label="Country">
              <Select
                value={compose.country}
                onChange={(event) =>
                  setCompose((current) => ({
                    ...current,
                    country: event.target.value,
                  }))
                }
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c.countryCode} value={c.countryCode}>
                    {c.countryName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Audience">
              <div className="flex flex-wrap gap-2">
                {[
                  ["PLAYER", "Players"],
                  ["COACH", "Coaches"],
                  ["CLUB_STAFF", "Club staff"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-drift-border px-3 py-2 text-sm text-drift-text-primary"
                  >
                    <input
                      type="checkbox"
                      checked={compose.audience.includes(value)}
                      onChange={() =>
                        setCompose((current) => ({
                          ...current,
                          audience: current.audience.includes(value)
                            ? current.audience.filter((item) => item !== value)
                            : [...current.audience, value],
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-drift-text-secondary">
                Leave all unchecked to reach every eligible app user.
              </p>
            </Field>
            <Field label="Title">
              <Input
                required
                minLength={3}
                maxLength={100}
                value={compose.title}
                onChange={(event) =>
                  setCompose((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Drift Tennis is live"
              />
            </Field>
            <Field label="Poster (optional)">
              <Input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => setPoster(event.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-drift-text-secondary">
                PNG or JPG, up to 5MB. Appears in the in-app notification and
                supported push surfaces.
              </p>
            </Field>
            <Field label="Schedule (optional)">
              <Input
                type="datetime-local"
                value={compose.scheduledFor}
                onChange={(event) =>
                  setCompose((current) => ({
                    ...current,
                    scheduledFor: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Message">
              <Textarea
                required
                rows={6}
                minLength={3}
                maxLength={500}
                value={compose.body}
                onChange={(event) =>
                  setCompose((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="The app is on the stores today. Thank you for waiting."
              />
            </Field>
            <p className="text-xs leading-5 text-drift-text-secondary">
              Reaches each recipient as a push notification and an in-app
              notification. Anyone who has turned off Announcements in their
              notification preferences is skipped, not notified anyway. Every
              send is recorded in the history below and in the audit log.
            </p>
            <Button
              type="submit"
              icon="send"
              disabled={busy || recipientCount === 0}
            >
              {busy
                ? "Saving..."
                : compose.scheduledFor
                  ? `Schedule for ${recipientCount ?? "…"} user(s)`
                  : `Send to ${recipientCount ?? "…"} user(s)`}
            </Button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
