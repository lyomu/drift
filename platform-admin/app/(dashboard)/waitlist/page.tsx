"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalShell, StatBand } from "@/components/dashboard-design";
import { FilterBar } from "@/components/FilterBar";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea, Th, Td } from "@/components/ui";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { dateTime } from "@/lib/support-types";
import type { WaitlistAudience, WaitlistBroadcastRow, WaitlistOverview } from "@/lib/waitlist-types";
import { audienceLabel, waitlistPersonName } from "@/lib/waitlist-types";

type ComposeForm = {
  subject: string;
  body: string;
  audience: WaitlistAudience | "";
};

const EMPTY_COMPOSE: ComposeForm = {
  subject: "",
  body: "",
  audience: "",
};

/**
 * The launch waitlist, managed. One page answers the two questions the list
 * exists for: how many people signed up (the stat band, whole-list always),
 * and who still needs the launch email (the "not emailed yet" counter, which
 * is every address no confirmed broadcast has reached).
 *
 * Sending is deliberate, not one-click-casual: the compose modal restates the
 * audience scope and recipient count from the same filter the server will
 * use, and every send lands in the history table below — so a launch email
 * cannot silently go out twice.
 */
export default function WaitlistPage() {
  const [overview, setOverview] = useState<WaitlistOverview | null>(null);
  const [broadcasts, setBroadcasts] = useState<WaitlistBroadcastRow[]>([]);
  const [audience, setAudience] = useState<WaitlistAudience | "">("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState<ComposeForm>(EMPTY_COMPOSE);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (audience) params.set("audience", audience);
      if (search.trim()) params.set("search", search.trim());
      const [nextOverview, nextBroadcasts] = await Promise.all([
        api.get<WaitlistOverview>(`/waitlist?${params.toString()}`),
        api.get<{ broadcasts?: WaitlistBroadcastRow[] } | WaitlistBroadcastRow[]>("/waitlist/broadcasts"),
      ]);
      setOverview(nextOverview);
      setBroadcasts(Array.isArray(nextBroadcasts) ? nextBroadcasts : (nextBroadcasts.broadcasts ?? []));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The waitlist could not be loaded.");
    }
  }, [audience, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    setError(null);
    try {
      const blob = await api.blob("/waitlist/export");
      downloadBlob(blob, "drift-tennis-waitlist.csv");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The export could not be downloaded.");
    }
  }

  async function sendBroadcast(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{
        recipientCount: number;
        deliveredCount: number;
        failedCount: number;
      }>("/waitlist/broadcast", {
        subject: compose.subject,
        body: compose.body,
        audience: compose.audience || null,
      });
      setShowCompose(false);
      setCompose(EMPTY_COMPOSE);
      setNotice(
        `Launch email sent to ${result.deliveredCount} of ${result.recipientCount} recipient(s)` +
          (result.failedCount > 0 ? `; ${result.failedCount} failed and can be retried.` : "."),
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The launch email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const stats = overview?.stats;
  const signups = overview?.signups ?? [];

  const recipientScope = compose.audience || null;
  const recipientCount =
    recipientScope === null
      ? (stats?.total ?? 0)
      : recipientScope === "PLAYER"
        ? (stats?.players ?? 0)
        : (stats?.clubs ?? 0);

  return (
    <div>
      <PageHeader
        title="Launch Waitlist"
        description="Signups from the public landing page. Players and clubs who asked to hear about launch — export the list for a mail provider, or email them from here."
        action={
          <>
            <Button variant="secondary" icon="download" disabled={busy} onClick={() => void exportCsv()}>
              Export CSV
            </Button>
            <Button icon="mark_email_read" onClick={() => setShowCompose(true)}>
              Email the list
            </Button>
          </>
        }
      />

      <ErrorBanner message={error} />
      {notice && (
        <div className="mb-4 rounded-lg border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm font-semibold text-drift-success">
          {notice}
        </div>
      )}

      <StatBand
        stats={[
          { label: "Total signups", value: stats?.total ?? "—", note: "Whole list, all audiences", icon: "group", tone: "blue" },
          { label: "Players", value: stats?.players ?? "—", icon: "sports_tennis", tone: "blue" },
          { label: "Clubs", value: stats?.clubs ?? "—", icon: "apartment", tone: "green" },
          { label: "Last 7 days", value: stats?.last7Days ?? "—", note: stats?.latestSignupAt ? `Latest: ${dateTime(stats.latestSignupAt)}` : undefined, icon: "trending_up", tone: "amber" },
          { label: "Not emailed yet", value: stats?.notEmailedYet ?? "—", note: "Addresses no broadcast has reached", icon: "mark_email_unread", tone: "gray" },
        ]}
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search email, name, city or country" }}
        filters={[
          {
            id: "audience",
            label: "Audience",
            anyLabel: "Any audience",
            value: audience,
            options: [
              { value: "PLAYER", label: "Players" },
              { value: "CLUB", label: "Clubs" },
            ],
            onChange: (value) => setAudience(value as WaitlistAudience | ""),
          },
        ]}
        resultCount={signups.length}
        totalCount={stats?.filtered}
        noun="signup"
      />

      <Card className="!p-0">
        {signups.length === 0 ? (
          <EmptyState
            icon="how_to_reg"
            message="No signups match."
            description="New signups from the landing page appear here as they come in."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem]">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Audience</Th>
                  <Th>Location</Th>
                  <Th>Level</Th>
                  <Th>Joined</Th>
                  <Th>Last emailed</Th>
                </tr>
              </thead>
              <tbody>
                {signups.map((signup) => (
                  <tr key={signup.id}>
                    <Td className="font-semibold">{waitlistPersonName(signup)}</Td>
                    <Td>{signup.email}</Td>
                    <Td>
                      <Badge tone={signup.audience === "CLUB" ? "success" : "info"}>
                        {signup.audience === "CLUB" ? "Club" : "Player"}
                      </Badge>
                    </Td>
                    <Td className="text-drift-text-secondary">
                      {[signup.city, signup.country].filter(Boolean).join(", ") || "—"}
                    </Td>
                    <Td>{signup.level ?? "—"}</Td>
                    <Td className="text-drift-text-secondary">{dateTime(signup.createdAt)}</Td>
                    <Td className="text-drift-text-secondary">
                      {signup.lastEmailedAt ? dateTime(signup.lastEmailedAt) : "Not yet"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <h2 className="mt-8 mb-3 text-[16px] font-bold text-drift-text-primary">Email history</h2>
      {broadcasts.length === 0 ? (
        <Card>
          <EmptyState
            icon="send"
            message="No emails sent yet."
            description="Every bulk send to the waitlist is recorded here, with its recipient and delivery counts."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-drift-text-primary">{broadcast.subject}</div>
                  <div className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-drift-text-secondary">
                    {broadcast.body}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="neutral">{audienceLabel(broadcast.audience)}</Badge>
                  <Badge tone={broadcast.failedCount === 0 ? "success" : "warning"}>
                    {broadcast.deliveredCount}/{broadcast.recipientCount} delivered
                  </Badge>
                </div>
              </div>
              <div className="mt-2 text-xs text-drift-text-secondary">
                Sent by {broadcast.sentBy.name || broadcast.sentBy.email} · {dateTime(broadcast.createdAt)}
                {broadcast.failedCount > 0 ? ` · ${broadcast.failedCount} failed` : ""}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCompose && (
        <ModalShell
          title="Email the waitlist"
          description={`One plain-text email per address. This send covers ${recipientCount} recipient(s): ${audienceLabel(recipientScope)}.`}
          onClose={() => setShowCompose(false)}
        >
          <form onSubmit={sendBroadcast} className="flex flex-col gap-4">
            <Field label="Audience">
              <Select
                value={compose.audience}
                onChange={(event) => setCompose((current) => ({ ...current, audience: event.target.value as WaitlistAudience | "" }))}
              >
                <option value="">Whole list ({stats?.total ?? 0})</option>
                <option value="PLAYER">Players only ({stats?.players ?? 0})</option>
                <option value="CLUB">Clubs only ({stats?.clubs ?? 0})</option>
              </Select>
            </Field>
            <Field label="Subject">
              <Input
                required
                minLength={3}
                maxLength={200}
                value={compose.subject}
                onChange={(event) => setCompose((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Drift Tennis is live"
              />
            </Field>
            <Field label="Message">
              <Textarea
                required
                rows={8}
                minLength={10}
                maxLength={4000}
                value={compose.body}
                onChange={(event) => setCompose((current) => ({ ...current, body: event.target.value }))}
                placeholder="The app is on the stores today. Thank you for waiting."
              />
            </Field>
            <p className="text-xs leading-5 text-drift-text-secondary">
              Each email opens with the person&apos;s first name where we have it and is signed &quot;Drift Tennis&quot;.
              Every send is recorded in the history below and in the audit log.
            </p>
            <Button
              type="submit"
              icon="send"
              disabled={busy || recipientCount === 0}
            >
              {busy ? "Sending..." : `Send to ${recipientCount} recipient(s)`}
            </Button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
