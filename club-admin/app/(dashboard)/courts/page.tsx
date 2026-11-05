"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { CourtGroupsEditor } from "@/components/CourtGroupsEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { MaterialIcon, ModalShell, RowCard } from "@/components/dashboard-design";
import { InlineSearch, ManagementCard } from "@/components/redesign";
import type { CourtGroup, CourtSummary } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

// Decorative venue banners; fixed colours so the white court lines stay visible in dark mode.
const COURT_BANNERS = [
  "from-[#0077cc] to-[#005a9e]",
  "from-[#0f766e] to-[#115e59]",
  "from-[#4f46e5] to-[#3730a3]",
];

function courtSetting(court: CourtSummary, t: ReturnType<typeof useT>) {
  if (court.indoorAvailable && court.outdoorAvailable) return t("ct.indoorOutdoor");
  if (court.indoorAvailable) return t("ct.indoor");
  if (court.outdoorAvailable) return t("ct.outdoor");
  return "";
}

export default function CourtsPage() {
  const t = useT();
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [courts, setCourts] = useState<CourtSummary[]>([]);
  const [courtQuery, setCourtQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimQuery, setClaimQuery] = useState("");
  const [claimResults, setClaimResults] = useState<CourtSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [groups, setGroups] = useState<CourtGroup[]>([
    { surface: "HARD", indoor: false, lighting: false, count: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ courts: CourtSummary[] }>(
      `/clubs/${clubId}/courts`,
    );
    setCourts(res.courts);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const verifiedCount = courts.filter((court) => court.verificationStatus === "VERIFIED").length;
  const visibleCourts = useMemo(() => {
    const q = courtQuery.trim().toLowerCase();
    if (!q) return courts;
    return courts.filter((court) => `${court.name} ${court.address ?? ""}`.toLowerCase().includes(q));
  }, [courts, courtQuery]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!clubId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/clubs/${clubId}/courts`, {
        name,
        address: address || undefined,
        mapsUrl: mapsUrl.trim() || undefined,
        courtGroups: groups,
      });
      setName("");
      setAddress("");
      setMapsUrl("");
      setGroups([{ surface: "HARD", indoor: false, lighting: false, count: 1 }]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const res = await api.get<{ courts: CourtSummary[] }>(
        `/courts?independentOnly=true&search=${encodeURIComponent(claimQuery)}`,
      );
      setClaimResults(res.courts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setSearching(false);
    }
  }

  async function handleClaim(courtId: string) {
    if (!clubId) return;
    setError(null);
    setClaiming(courtId);
    try {
      await api.patch(`/clubs/${clubId}/courts/${courtId}/claim`);
      setClaimResults((prev) => prev.filter((c) => c.id !== courtId));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.operations")}
        title={t("a.courts")}
        description={t("a.courtsThisClubOwnsOr")}
        action={
          canManage && (
            <Button onClick={() => setShowForm(true)}>
              <MaterialIcon name="add" className="text-[19px]" />
              {t("a.newCourt")}
            </Button>
          )
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message={t("a.loading")} />
      ) : courts.length === 0 ? (
        <EmptyState
          icon="sports_tennis"
          title={t("a.noCourts")}
          description={t("a.courtsAreOptionalManyClubs")}
          action={
            canManage ? <Button onClick={() => setShowForm(true)}>{t("a.newCourt")}</Button> : undefined
          }
        />
      ) : (
        <>
          <div className="mb-[18px] flex items-center gap-4 rounded-2xl border border-drift-border bg-drift-surface p-4 shadow-card">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0077cc] to-[#005a9e] text-white">
              <MaterialIcon name="stadium" className="text-[28px]" />
            </span>
            <div className="min-w-0">
              <span className="block text-[11px] font-bold uppercase text-drift-text-secondary">
                {t("ct.readiness")}
              </span>
              <strong className="mt-0.5 block text-[14px] font-extrabold text-drift-text-primary">
                {verifiedCount === courts.length ? t("ct.allVerified") : t("ct.someVerified", { verified: verifiedCount, total: courts.length })}
              </strong>
            </div>
          </div>

          <ManagementCard
            title={t("ct.venues")}
            subtitle={t("ct.managedCount", { count: visibleCourts.length })}
            actions={
              <InlineSearch
                value={courtQuery}
                onChange={setCourtQuery}
                placeholder={t("ct.searchPlaceholder")}
                className="w-[230px]"
              />
            }
          >
            {visibleCourts.length === 0 ? (
              <EmptyState bare icon="search_off" title={t("ct.noMatches")} />
            ) : (
              <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCourts.map((court, index) => (
                  <Link href={`/courts/${court.id}`} key={court.id} className="group block h-full">
                    <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-drift-border bg-drift-surface transition-all group-hover:-translate-y-px group-hover:border-drift-primary">
                      <div className={`relative h-[98px] bg-gradient-to-br ${COURT_BANNERS[index % COURT_BANNERS.length]}`}>
                        {/* Court-line motif: baseline box, centre line and circle. */}
                        <div className="absolute inset-x-3 bottom-3 top-[30px] rounded-sm border border-white/50" />
                        <div className="absolute bottom-3 left-1/2 top-[30px] w-px bg-white/50" />
                        <div className="absolute left-1/2 top-[calc(50%+9px)] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
                        <span className="absolute left-3.5 top-2 text-[11px] font-bold uppercase text-white/90">
                          {t("ct.courtNumber", { n: index + 1 })}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-start justify-between gap-2">
                          <StatusBadge status={court.verificationStatus} />
                        </div>
                        <h3 className="mt-2.5 truncate text-[15px] font-extrabold text-drift-text-primary">
                          {court.name}
                        </h3>
                        <p className="mt-1 truncate text-[12px] text-drift-text-secondary">
                          {court.address ?? t("a.noAddressOnFile")}
                        </p>
                        <div className="mt-auto flex items-center justify-between border-t border-drift-border pt-3.5 text-[11px]">
                          <span className="text-drift-text-secondary">{courtSetting(court, t)}</span>
                          <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-drift-primary">
                            {t("a.manage")}
                            <MaterialIcon name="chevron_right" className="text-[16px]" />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </ManagementCard>
        </>
      )}

      {canManage && (
        <Card className="mt-[18px] border-dashed shadow-none">
          <h2 className="mb-1 text-[14px] font-extrabold text-drift-text-primary">{t("a.claimAnExistingCourt")}</h2>
          <p className="mb-3 text-sm text-drift-text-secondary">{t("a.searchIndependentCourtsWithNo")}</p>
          <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={claimQuery}
              onChange={(e) => setClaimQuery(e.target.value)}
              placeholder={t("a.searchByName")}
            />
            <Button type="submit" variant="secondary" disabled={searching}>
              {searching ? t("a.searching") : t("a.search")}
            </Button>
          </form>
          {claimResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {claimResults.map((court) => (
                <RowCard
                  key={court.id}
                  className="flex items-center justify-between gap-3 rounded-md border-drift-border"
                >
                  <div>
                    <div className="font-bold text-drift-text-primary">{court.name}</div>
                    <div className="text-sm text-drift-text-secondary">
                      {court.address ?? t("a.noAddressOnFile")}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={claiming === court.id}
                    onClick={() => void handleClaim(court.id)}
                  >
                    {claiming === court.id ? t("a.claiming") : t("a.claim")}
                  </Button>
                </RowCard>
              ))}
            </div>
          )}
        </Card>
      )}

      {showForm && (
        <ModalShell title={t("a.newCourt")} size="lg" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label={t("a.name")}>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("a.addressLocation")}>
              <Input value={address} placeholder={t("a.streetAreaCity")} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label={t("a.googleMapsLinkOptional")}>
              <Input type="url" inputMode="url" placeholder="https://maps.google.com/…" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
            </Field>
            <CourtGroupsEditor groups={groups} onChange={setGroups} />
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                {t("a.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("a.creating") : t("a.createCourt")}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
