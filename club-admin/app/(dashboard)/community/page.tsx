"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, mediaUrl } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  statusTone,
} from "@/components/ui";
import { Panel } from "@/components/dashboard-design";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { MessageKey } from "@/lib/i18n/messages/en";

type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "OTHER";
type JoinPolicy = "OPEN" | "BY_REQUEST";
type Status = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

interface Member {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "REQUESTED" | "ACTIVE";
  since: string;
}

interface ClubCommunity {
  id: string;
  name: string;
  city: string;
  frequency: Frequency;
  about: string | null;
  photoUrl: string | null;
  joinPolicy: JoinPolicy;
  status: Status;
  decisionNote: string | null;
  memberCount: number;
  owner: Member | null;
}

interface Response {
  community: ClubCommunity | null;
  members?: Member[];
  requests?: Member[];
}

const FREQUENCY_KEY: Record<Frequency, MessageKey> = {
  WEEKLY: "clubCommunity.frequencyWeekly",
  BIWEEKLY: "clubCommunity.frequencyBiweekly",
  MONTHLY: "clubCommunity.frequencyMonthly",
  OTHER: "clubCommunity.frequencyOther",
};

const STATUS_KEY: Record<Status, MessageKey> = {
  PENDING: "clubCommunity.statusPending",
  APPROVED: "clubCommunity.statusApproved",
  REJECTED: "clubCommunity.statusRejected",
  SUSPENDED: "clubCommunity.statusSuspended",
};

const ROLE_KEY: Record<Member["role"], MessageKey> = {
  OWNER: "clubCommunity.roleOwner",
  ADMIN: "clubCommunity.roleAdmin",
  MEMBER: "clubCommunity.roleMember",
};

const emptyForm = {
  name: "",
  city: "",
  frequency: "WEEKLY" as Frequency,
  about: "",
  joinPolicy: "BY_REQUEST" as JoinPolicy,
};

/**
 * The club's own community (2026-11): a group in the Drift app with its own
 * members and chat, where players find the club under Community. Created
 * here, then reviewed by Drift before it goes live. Whoever creates it
 * becomes its owner in the app.
 */
export default function ClubCommunityPage() {
  const { t, tp } = useI18n();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [data, setData] = useState<Response | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/clubs/${clubId}/community`;

  const load = useCallback(async () => {
    if (!clubId) return;
    setError(null);
    try {
      const res = await api.get<Response>(`/clubs/${clubId}/community`);
      setData(res);
      if (res.community) {
        setForm({
          name: res.community.name,
          city: res.community.city,
          frequency: res.community.frequency,
          about: res.community.about ?? "",
          joinPolicy: res.community.joinPolicy,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("clubCommunity.loadFailed"));
    }
  }, [clubId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, failKey: MessageKey) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t(failKey));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      city: form.city.trim(),
      frequency: form.frequency,
      about: form.about.trim() || undefined,
      joinPolicy: form.joinPolicy,
    };
    const ok = await run(
      () => (data?.community ? api.patch(base, body) : api.post(base, body)),
      "clubCommunity.saveFailed",
    );
    if (ok) setEditing(false);
  }

  async function uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    await run(() => api.upload(`${base}/photo`, formData), "clubCommunity.photoFailed");
  }

  const community = data?.community ?? null;
  const showForm = canManage && (!community || editing);

  const formView = (
    <Panel>
      <h2 className="mb-1 text-base font-bold text-drift-text-primary">
        {community ? t("clubCommunity.editTitle") : t("clubCommunity.createTitle")}
      </h2>
      {!community && (
        <p className="mb-4 text-[12.5px] text-drift-text-secondary">
          {t("clubCommunity.createHint")}
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("clubCommunity.name")}>
          <Input
            required
            minLength={2}
            maxLength={60}
            placeholder={t("clubCommunity.namePlaceholder")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label={t("clubCommunity.city")}>
          <Input
            required
            minLength={2}
            maxLength={80}
            placeholder={t("clubCommunity.cityPlaceholder")}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </Field>
        <Field label={t("clubCommunity.howOften")}>
          <Select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
          >
            {(Object.keys(FREQUENCY_KEY) as Frequency[]).map((value) => (
              <option key={value} value={value}>
                {t(FREQUENCY_KEY[value])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("clubCommunity.about")}>
          <Textarea
            rows={3}
            maxLength={1000}
            placeholder={t("clubCommunity.aboutPlaceholder")}
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
          />
        </Field>
        <Field label={t("clubCommunity.whoCanJoin")}>
          <Select
            value={form.joinPolicy}
            onChange={(e) => setForm({ ...form, joinPolicy: e.target.value as JoinPolicy })}
          >
            <option value="OPEN">{t("clubCommunity.joinOpen")}</option>
            <option value="BY_REQUEST">{t("clubCommunity.joinByRequest")}</option>
          </Select>
        </Field>
        <div className="mt-2 flex justify-end gap-3">
          {community && (
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              {t("a.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {community ? t("clubCommunity.save") : t("clubCommunity.submit")}
          </Button>
        </div>
      </form>
    </Panel>
  );

  return (
    <div>
      <PageHeader
        title={t("clubCommunity.title")}
        description={t("clubCommunity.description")}
        action={
          canManage && community && !editing ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t("clubCommunity.edit")}
            </Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      {data === null && !error && <EmptyState message={t("clubCommunity.loading")} />}

      {data && !community && !canManage && (
        <EmptyState
          icon="groups"
          title={t("clubCommunity.noneTitle")}
          description={t("clubCommunity.noneReadOnly")}
        />
      )}

      {data && showForm && formView}

      {community && !editing && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel>
            <div className="flex items-start gap-4">
              {community.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(community.photoUrl) ?? undefined}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-drift-text-primary">{community.name}</h2>
                  <Badge tone={statusTone(community.status)}>{t(STATUS_KEY[community.status])}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] text-drift-text-secondary">
                  {community.city} · {t(FREQUENCY_KEY[community.frequency])} ·{" "}
                  {community.joinPolicy === "OPEN"
                    ? t("clubCommunity.joinOpen")
                    : t("clubCommunity.joinByRequest")}{" "}
                  · {tp("clubCommunity.memberCount", community.memberCount, {
                    count: community.memberCount,
                  })}
                </p>
                {community.owner && (
                  <p className="mt-1 text-[12.5px] text-drift-text-secondary">
                    {t("clubCommunity.ownedBy", { name: community.owner.displayName })}
                  </p>
                )}
              </div>
            </div>
            {community.about && (
              <p className="mt-4 text-sm text-drift-text-primary">{community.about}</p>
            )}
            <p className="mt-4 rounded-md bg-drift-primary-light px-3 py-2 text-[12.5px] text-drift-text-secondary">
              {community.status === "PENDING" && t("clubCommunity.pendingHint")}
              {community.status === "APPROVED" && t("clubCommunity.approvedHint")}
              {community.status === "SUSPENDED" && t("clubCommunity.suspendedHint")}
              {community.status === "REJECTED" &&
                (community.decisionNote
                  ? t("clubCommunity.rejectedWithNote", { note: community.decisionNote })
                  : t("clubCommunity.rejectedHint"))}
            </p>
            {canManage && (
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-drift-primary">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                    e.target.value = "";
                  }}
                />
                {community.photoUrl ? t("clubCommunity.changePhoto") : t("clubCommunity.addPhoto")}
              </label>
            )}
          </Panel>

          <Panel>
            {canManage && (data?.requests?.length ?? 0) > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-bold text-drift-text-primary">
                  {t("clubCommunity.requests")}
                </h3>
                <div className="flex flex-col gap-2">
                  {data!.requests!.map((request) => (
                    <div
                      key={request.userId}
                      className="flex items-center justify-between gap-3 rounded-md border border-drift-border px-3 py-2.5"
                    >
                      <span className="text-[13.5px] font-bold text-drift-text-primary">
                        {request.displayName}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => api.post(`${base}/requests/${request.userId}/decline`),
                              "clubCommunity.actionFailed",
                            )
                          }
                        >
                          {t("clubCommunity.decline")}
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => api.post(`${base}/requests/${request.userId}/approve`),
                              "clubCommunity.actionFailed",
                            )
                          }
                        >
                          {t("clubCommunity.approve")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="mb-2 text-sm font-bold text-drift-text-primary">
              {t("clubCommunity.members")}
            </h3>
            {(data?.members?.length ?? 0) === 0 ? (
              <EmptyState bare compact icon="group_add" title={t("clubCommunity.noMembers")} />
            ) : (
              <div className="flex flex-col gap-2">
                {data!.members!.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-3 rounded-md border border-drift-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-bold text-drift-text-primary">
                        {member.displayName}
                      </div>
                      <div className="text-xs text-drift-text-secondary">
                        {t(ROLE_KEY[member.role])}
                      </div>
                    </div>
                    {canManage && member.role !== "OWNER" && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                api.patch(`${base}/members/${member.userId}`, {
                                  role: member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                }),
                              "clubCommunity.actionFailed",
                            )
                          }
                        >
                          {member.role === "ADMIN"
                            ? t("clubCommunity.removeAdmin")
                            : t("clubCommunity.makeAdmin")}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(t("clubCommunity.removeConfirm", { name: member.displayName }))) return;
                            void run(
                              () => api.delete(`${base}/members/${member.userId}`),
                              "clubCommunity.actionFailed",
                            );
                          }}
                        >
                          {t("clubCommunity.remove")}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
