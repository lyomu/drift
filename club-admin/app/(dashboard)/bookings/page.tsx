"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Badge, Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { MaterialIcon, ModalActions, ModalShell } from "@/components/dashboard-design";
import { SegmentControl } from "@/components/redesign";
import { useToast } from "@/components/Toast";
import { useI18n, useT } from "@/lib/i18n/i18n-context";
import { addDays, localYmd, zonedToUtc } from "@/lib/tz";
import type { CourtBooking, CourtProfile, CourtSummary, Member } from "@/lib/types";

type View = "day" | "week";
type Decision = { booking: CourtBooking; kind: "DECLINE" | "CANCEL" };

function personName(b: CourtBooking) {
  return b.user ? `${b.user.firstName ?? ""} ${b.user.lastName ?? ""}`.trim() : (b.guestName ?? "");
}

/** Monday of the week containing `ymd`. */
function weekStart(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(ymd, -((dow + 6) % 7));
}

export default function BookingsPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { notify } = useToast();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";

  const [courts, setCourts] = useState<CourtSummary[] | null>(null);
  const [pending, setPending] = useState<CourtBooking[]>([]);
  const [bookings, setBookings] = useState<CourtBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("day");
  const [courtFilter, setCourtFilter] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [adding, setAdding] = useState(false);

  const bookable = useMemo(() => (courts ?? []).filter((c) => c.bookingType === "NATIVE_PARTNER"), [courts]);
  // Timezone of the court being viewed; the calendar's "day" is that court's local day.
  const tz = useMemo(() => {
    const c = (courtFilter ? bookable.find((x) => x.id === courtFilter) : null) ?? bookable[0];
    const fromBookings = bookings[0]?.court.timezone;
    return (c && bookings.find((b) => b.court.id === c.id)?.court.timezone) ?? fromBookings ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [bookable, courtFilter, bookings]);
  const today = localYmd(new Date(), tz);
  const selectedDay = day ?? today;

  const range = useMemo(() => {
    const start = view === "week" ? weekStart(selectedDay) : selectedDay;
    const end = addDays(start, view === "week" ? 7 : 1);
    return { start, from: zonedToUtc(start, "00:00", tz), to: zonedToUtc(end, "00:00", tz) };
  }, [view, selectedDay, tz]);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const q = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
      if (courtFilter) q.set("courtId", courtFilter);
      const [c, p, b] = await Promise.all([
        api.get<{ courts: CourtSummary[] }>(`/clubs/${clubId}/courts`),
        api.get<{ bookings: CourtBooking[] }>(`/clubs/${clubId}/bookings?status=PENDING`),
        api.get<{ bookings: CourtBooking[] }>(`/clubs/${clubId}/bookings?${q}`),
      ]);
      setCourts(c.courts);
      const now = Date.now();
      setPending(p.bookings.filter((x) => new Date(x.endsAt).getTime() > now));
      setBookings(b.bookings.filter((x) => x.status === "PENDING" || x.status === "APPROVED"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }, [clubId, range, courtFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const time = (b: CourtBooking, iso: string) =>
    formatDate(iso, { hour: "2-digit", minute: "2-digit", timeZone: b.court.timezone });
  const when = (b: CourtBooking) =>
    `${formatDate(b.startsAt, { weekday: "short", day: "numeric", month: "short", timeZone: b.court.timezone })} · ${time(b, b.startsAt)}–${time(b, b.endsAt)}`;

  function statusBadge(b: CourtBooking) {
    if (b.completed) return <Badge tone="neutral">{t("bk.statusCompleted")}</Badge>;
    if (b.status === "PENDING") return <Badge tone="warning">{t("bk.statusPending")}</Badge>;
    if (b.status === "APPROVED") return <Badge tone="success">{t("bk.statusApproved")}</Badge>;
    if (b.status === "DECLINED") return <Badge tone="error">{t("bk.statusDeclined")}</Badge>;
    return <Badge tone="neutral">{t("bk.statusCancelled")}</Badge>;
  }

  async function approve(b: CourtBooking) {
    setBusy(b.id);
    setError(null);
    try {
      await api.patch(`/clubs/${clubId}/bookings/${b.id}`, { decision: "APPROVE" });
      notify(t("bk.statusApproved"));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setBusy(null);
    }
  }

  const surfaceLabel = (b: CourtBooking) => t(`surface.${b.courtGroup.surface}`);

  function BookingChip({ b }: { b: CourtBooking }) {
    return (
      <div className="rounded-xl border border-drift-border bg-drift-surface px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <strong className="text-[12px] font-bold text-drift-text-primary tabular">
            {time(b, b.startsAt)}–{time(b, b.endsAt)}
          </strong>
          {statusBadge(b)}
        </div>
        <div className="mt-1 truncate text-[12px] text-drift-text-primary">{personName(b) || "—"}</div>
        <div className="truncate text-[11px] text-drift-text-secondary">
          {b.court.name} · {surfaceLabel(b)}
        </div>
        {canManage && !b.completed && (
          <div className="mt-2 flex gap-1.5">
            {b.status === "PENDING" && (
              <Button size="sm" disabled={busy === b.id} onClick={() => void approve(b)}>
                {t("bk.approve")}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setDecision({ booking: b, kind: b.status === "PENDING" ? "DECLINE" : "CANCEL" })}>
              {b.status === "PENDING" ? t("bk.decline") : t("bk.cancelBooking")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(range.start, i)) : [selectedDay];
  const byDay = (ymd: string) =>
    bookings.filter((b) => localYmd(new Date(b.startsAt), b.court.timezone) === ymd).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dayLabel = (ymd: string) =>
    formatDate(zonedToUtc(ymd, "12:00", tz), { weekday: "short", day: "numeric", month: "short", timeZone: tz });

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.operations")}
        title={t("bk.title")}
        description={t("bk.description")}
        action={
          canManage && bookable.length > 0 ? (
            <Button onClick={() => setAdding(true)}>
              <MaterialIcon name="add" className="text-[18px]" />
              {t("bk.addBooking")}
            </Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      {courts !== null && bookable.length === 0 ? (
        <EmptyState
          icon="event_available"
          title={t("bk.noBookableCourts")}
          action={
            <Link href="/courts">
              <Button variant="secondary">{t("bk.setUpCourt")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-3 text-[14px] font-extrabold text-drift-text-primary">
              {t("bk.pending")} {pending.length > 0 && <span className="text-drift-text-secondary">({pending.length})</span>}
            </h2>
            {pending.length === 0 ? (
              <EmptyState icon="inbox" title={t("bk.pendingEmpty")} description={t("bk.pendingEmptyHint")} />
            ) : (
              <div className="flex flex-col gap-2">
                {pending.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-drift-border bg-drift-surface px-5 py-4"
                  >
                    <div className="min-w-[220px] flex-1">
                      <strong className="block text-[13px] font-bold text-drift-text-primary">
                        {t("bk.requestedBy", { name: personName(b) })}
                      </strong>
                      <span className="block text-[12px] text-drift-text-secondary">
                        {b.court.name} · {surfaceLabel(b)} · {when(b)}
                      </span>
                      {b.note && (
                        <span className="mt-1 block text-[12px] text-drift-text-secondary">{t("bk.playerNote", { note: b.note })}</span>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy === b.id} onClick={() => void approve(b)}>
                          {t("bk.approve")}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setDecision({ booking: b, kind: "DECLINE" })}>
                          {t("bk.decline")}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="mr-auto text-[14px] font-extrabold text-drift-text-primary">{t("bk.calendar")}</h2>
              <Select className="!w-auto" value={courtFilter} onChange={(e) => setCourtFilter(e.target.value)} aria-label={t("bk.court")}>
                <option value="">{t("bk.allCourts")}</option>
                {bookable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <SegmentControl<View>
                value={view}
                onChange={setView}
                options={[
                  { value: "day", label: t("bk.day") },
                  { value: "week", label: t("bk.week") },
                ]}
              />
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="secondary" aria-label="‹" onClick={() => setDay(addDays(selectedDay, view === "week" ? -7 : -1))}>
                  <MaterialIcon name="chevron_left" className="text-[18px]" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setDay(today)}>
                  {t("bk.today")}
                </Button>
                <Button size="sm" variant="secondary" aria-label="›" onClick={() => setDay(addDays(selectedDay, view === "week" ? 7 : 1))}>
                  <MaterialIcon name="chevron_right" className="text-[18px]" />
                </Button>
              </div>
            </div>
            <div className={view === "week" ? "grid grid-cols-1 gap-3 md:grid-cols-7" : "grid grid-cols-1 gap-3"}>
              {days.map((ymd) => {
                const items = byDay(ymd);
                return (
                  <div key={ymd} className="rounded-2xl border border-drift-border bg-drift-surface-sunken p-3">
                    <div className="mb-2 text-[12px] font-extrabold text-drift-text-primary">{dayLabel(ymd)}</div>
                    {items.length === 0 ? (
                      <p className="text-[12px] text-drift-text-secondary">{t("bk.emptyDay")}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {items.map((b) => (
                          <BookingChip key={b.id} b={b} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {decision && clubId && (
        <DecisionModal
          clubId={clubId}
          decision={decision}
          onClose={() => setDecision(null)}
          onDone={async () => {
            setDecision(null);
            await load();
          }}
        />
      )}
      {adding && clubId && (
        <AddBookingModal
          clubId={clubId}
          courts={bookable}
          onClose={() => setAdding(false)}
          onDone={async () => {
            setAdding(false);
            notify(t("bk.statusApproved"));
            await load();
          }}
        />
      )}
    </div>
  );
}

function DecisionModal({
  clubId,
  decision,
  onClose,
  onDone,
}: {
  clubId: string;
  decision: Decision;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const t = useT();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCancel = decision.kind === "CANCEL";

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (isCancel) {
        await api.post(`/clubs/${clubId}/bookings/${decision.booking.id}/cancel`, { note });
      } else {
        await api.patch(`/clubs/${clubId}/bookings/${decision.booking.id}`, { decision: "DECLINE", note });
      }
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
      setSaving(false);
    }
  }

  return (
    <ModalShell title={isCancel ? t("bk.cancelTitle") : t("bk.declineTitle")} icon="event_busy" onClose={onClose}>
      <ErrorBanner message={error} />
      <Field label={isCancel ? t("bk.cancelReason") : t("bk.noteOptional")}>
        <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          {t("bk.keep")}
        </Button>
        <Button variant="destructive" disabled={saving} onClick={() => void submit()}>
          {isCancel ? t("bk.cancelBooking") : t("bk.decline")}
        </Button>
      </ModalActions>
    </ModalShell>
  );
}

function AddBookingModal({
  clubId,
  courts,
  onClose,
  onDone,
}: {
  clubId: string;
  courts: CourtSummary[];
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const t = useT();
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [profile, setProfile] = useState<CourtProfile | null>(null);
  const [tz, setTz] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [groupId, setGroupId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ members: Member[] }>(`/clubs/${clubId}/members`).then((r) => setMembers(r.members.filter((m) => m.status === "ACTIVE")));
  }, [clubId]);

  useEffect(() => {
    if (!courtId) return;
    let cancelled = false;
    Promise.all([
      api.get<CourtProfile>(`/courts/${courtId}`),
      api.get<{ timezone: string }>(`/clubs/${clubId}/courts/${courtId}/booking-settings`),
    ]).then(([p, s]) => {
      if (cancelled) return;
      setProfile(p);
      setTz(s.timezone);
      setGroupId(p.courtGroups[0]?.id ?? "");
      setDate((d) => d || localYmd(new Date(), s.timezone));
    });
    return () => {
      cancelled = true;
    };
  }, [clubId, courtId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/clubs/${clubId}/bookings`, {
        courtId,
        courtGroupId: groupId,
        startsAt: zonedToUtc(date, start, tz).toISOString(),
        endsAt: zonedToUtc(date, end, tz).toISOString(),
        ...(userId ? { userId } : { guestName }),
        ...(note.trim() ? { note } : {}),
      });
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
      setSaving(false);
    }
  }

  return (
    <ModalShell title={t("bk.addBooking")} description={t("bk.addBookingHint")} icon="event_available" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Field label={t("bk.court")}>
          <Select value={courtId} onChange={(e) => setCourtId(e.target.value)}>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {profile && profile.courtGroups.length > 1 && (
          <Field label={t("bk.surface")}>
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {profile.courtGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {t(`surface.${g.surface}`)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={t("bk.date")}>
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("bk.start")}>
            <Input type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t("bk.end")}>
            <Input type="time" required value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label={t("bk.bookedFor")}>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{t("bk.guestOption")}</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email}
              </option>
            ))}
          </Select>
        </Field>
        {!userId && (
          <Field label={t("bk.guestName")}>
            <Input required maxLength={120} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </Field>
        )}
        <Field label={t("bk.noteLabel")}>
          <Input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={saving || !groupId}>
            {t("bk.addBooking")}
          </Button>
        </ModalActions>
      </form>
    </ModalShell>
  );
}
