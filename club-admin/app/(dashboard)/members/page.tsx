"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Textarea, Td, Th } from "@/components/ui";
import { ActionMenu, FilterSelect, InlineSearch, ManagementCard } from "@/components/redesign";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar, MaterialIcon, ModalActions, ModalShell } from "@/components/dashboard-design";
import { SelectEditControl } from "@/components/EditFieldModal";
import { useToast } from "@/components/Toast";
import type { ClubRole, Member } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

const ROLES: ClubRole[] = [
  "OWNER",
  "ADMIN",
  "COMPETITION_MANAGER",
  "COACH",
  "CONTENT_MANAGER",
  "READ_ONLY",
];

/** Statuses a directory member can be in; PENDING people live in Join requests. */
const DIRECTORY_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"] as const;

function memberName(member: Member) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email;
}

export default function MembersPage() {
  const t = useT();
  const router = useRouter();
  const { notify } = useToast();
  const { formatDate } = useI18n();
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    invited: number;
    failed: { email: string; reason: string }[];
  } | null>(null);

  async function loadMembers() {
    if (!clubId) return;
    const res = await api.get<{ members: Member[] }>(
      `/clubs/${clubId}/members`,
    );
    setMembers(res.members);
    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    setInviting(true);
    try {
      await api.post(`/clubs/${clubId}/members`, {
        email: inviteEmail,
        role: "READ_ONLY",
      });
      setInviteEmail("");
      setShowInvite(false);
      await loadMembers();
      notify(t("members.toastInvited"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setInviting(false);
    }
  }

  async function handleExport() {
    if (!clubId) return;
    setError(null);
    try {
      downloadBlob(await api.blob(`/clubs/${clubId}/members.csv`), "members.csv");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.memberExportFailedTryAgain"));
    }
  }

  function parseCsv(text: string): { email: string; role: ClubRole }[] {
    const rows: { email: string; role: ClubRole }[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const [rawEmail, rawRole] = line.split(",").map((c) => c.trim());
      if (!rawEmail || !rawEmail.includes("@")) continue; // skips a header row too
      const role = (rawRole ?? "").toUpperCase().replace(/\s+/g, "_");
      rows.push({
        email: rawEmail,
        role: (ROLES as string[]).includes(role)
          ? (role as ClubRole)
          : "READ_ONLY",
      });
    }
    return rows;
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    const rows = parseCsv(importText);
    if (rows.length === 0) {
      setError(t("a.noValidRowsFoundUse"));
      return;
    }
    setImporting(true);
    setError(null);
    const failed: { email: string; reason: string }[] = [];
    let invited = 0;
    for (const row of rows) {
      try {
        await api.post(`/clubs/${clubId}/members`, row);
        invited += 1;
      } catch (err) {
        failed.push({
          email: row.email,
          reason: err instanceof ApiError ? err.message : t("members.couldNotInvite"),
        });
      }
    }
    setImportResult({ invited, failed });
    setImporting(false);
    await loadMembers();
  }

  async function handleRoleChange(member: Member, role: ClubRole) {
    if (!clubId) return;
    setError(null);
    await api.patch(`/clubs/${clubId}/members/${member.membershipId}`, { role });
    await loadMembers();
    notify(t("members.toastRole", { name: memberName(member) }));
  }

  async function handleRemove(member: Member) {
    if (!clubId) return;
    setError(null);
    try {
      await api.delete(`/clubs/${clubId}/members/${member.membershipId}`);
      await loadMembers();
      notify(t("members.toastRemoved", { name: memberName(member) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }

  async function handleApproval(member: Member, approve: boolean) {
    if (!clubId) return;
    setError(null);
    try {
      if (approve) {
        await api.patch(`/clubs/${clubId}/members/${member.membershipId}`, {
          status: "ACTIVE",
        });
      } else {
        await api.delete(`/clubs/${clubId}/members/${member.membershipId}`);
      }
      await loadMembers();
      notify(
        t(approve ? "members.toastApproved" : "members.toastDeclined", {
          name: memberName(member),
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }

  const pending = members.filter((m) => m.status === "PENDING");
  const directory = useMemo(() => members.filter((m) => m.status !== "PENDING"), [members]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.filter((member) => {
      const matches =
        !q ||
        `${memberName(member)} ${member.email} ${member.role.replace(/_/g, " ")}`
          .toLowerCase()
          .includes(q);
      return matches && (statusFilter === "ALL" || member.status === statusFilter);
    });
  }, [directory, query, statusFilter]);

  return (
    <div>
      <PageHeader
        eyebrow={t("members.eyebrow")}
        title={t("a.members")}
        description={t("a.everyoneWithAdminAccessTo")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => void handleExport()}>
              <MaterialIcon name="download" className="text-[18px]" />
              {t("a.exportCsv")}
            </Button>
            {canManage && (
              <Button
                variant="secondary"
                onClick={() => {
                  setImportResult(null);
                  setImportText("");
                  setShowImport(true);
                }}
              >
                <MaterialIcon name="upload" className="text-[18px]" />
                {t("members.importCsv")}
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setShowInvite(true)}>
                <MaterialIcon name="person_add" className="text-[18px]" />
                {t("a.inviteMember")}
              </Button>
            )}
          </div>
        }
      />
      <ErrorBanner message={error} />

      {showImport && (
        <ModalShell
          title={t("a.importMembersFromCsv")}
          icon="upload_file"
          onClose={() => setShowImport(false)}
        >
          {importResult ? (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-drift-text-primary">
                <span className="font-bold text-drift-success">
                  {t("members.invitedCount", { count: importResult.invited })}
                </span>
                {importResult.failed.length > 0 && (
                  <>
                    {" · "}
                    <span className="font-bold text-drift-error">
                      {t("members.skippedCount", { count: importResult.failed.length })}
                    </span>
                  </>
                )}
              </p>
              {importResult.failed.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-[9px] border border-drift-border">
                  {importResult.failed.map((f) => (
                    <div
                      key={f.email}
                      className="border-b border-drift-border px-3 py-2 text-[12px] last:border-b-0"
                    >
                      <span className="font-semibold text-drift-text-primary">
                        {f.email}
                      </span>{" "}
                      <span className="text-drift-text-secondary">— {f.reason}</span>
                    </div>
                  ))}
                </div>
              )}
              <ModalActions>
                <Button onClick={() => setShowImport(false)}>{t("a.done")}</Button>
              </ModalActions>
            </div>
          ) : (
            <form onSubmit={handleImport} className="flex flex-col gap-4">
              <p className="text-[12px] leading-[1.55] text-drift-text-secondary">
                {t("a.memberImportInstructions")}
              </p>
              <Field label={t("a.pasteCsvOr")}>
                <Textarea
                  rows={7}
                  autoFocus
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"alex@club.com,ADMIN\nsam@club.com,COACH\njordan@club.com"}
                />
              </Field>
              <label className="text-[12px] font-bold text-drift-primary">
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setImportText(await file.text());
                    e.target.value = "";
                  }}
                />
                <span className="cursor-pointer hover:underline">{t("a.chooseACsvFile")}</span>
              </label>
              <ModalActions>
                <Button type="button" variant="secondary" onClick={() => setShowImport(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={importing || !importText.trim()}>
                  {importing ? t("a.importing") : t("a.importMembers")}
                </Button>
              </ModalActions>
            </form>
          )}
        </ModalShell>
      )}

      {showInvite && (
        <ModalShell
          title={t("a.inviteAMember")}
          description={t("a.theyJoinWithReadOnly")}
          icon="mail"
          onClose={() => setShowInvite(false)}
        >
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <Field label={t("a.email")}>
              <Input
                type="email"
                required
                autoFocus
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t("a.mustAlreadyHaveADrift")}
              />
            </Field>
            <ModalActions>
              <Button type="button" variant="secondary" onClick={() => setShowInvite(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? t("a.inviting") : t("a.invite")}
              </Button>
            </ModalActions>
          </form>
        </ModalShell>
      )}

      {canManage && pending.length > 0 && (
        <section className="mb-[18px] overflow-hidden rounded-[14px] border border-drift-border bg-drift-surface shadow-card">
          <div className="flex min-h-[63px] flex-wrap items-center justify-between gap-2 border-b border-drift-border bg-gradient-to-r from-drift-gold-surface to-drift-surface py-3">
            <div className="flex items-center gap-2">
              <span className="h-[7px] w-[7px] rounded-full bg-drift-gold shadow-[0_0_0_4px_var(--color-accent-gold-surface)]" />
              <h2 className="text-[13px] font-extrabold text-drift-text-primary">
                {t("members.joinRequests")}
              </h2>
              <span className="min-w-5 rounded-full bg-drift-gold-surface px-1.5 py-[3px] text-center text-[11px] font-extrabold text-drift-gold">
                {pending.length}
              </span>
            </div>
            <p className="text-[11px] text-drift-text-secondary">{t("members.joinRequestsHint")}</p>
          </div>
          <div className="px-[13px] py-[3px]">
            {pending.map((member) => (
              <div
                key={member.membershipId}
                className="flex min-h-[66px] flex-wrap items-center gap-3 border-b border-drift-border px-1 py-[9px] last:border-b-0"
              >
                <InitialsAvatar name={memberName(member)} tone="gold" />
                <div className="min-w-[150px] flex-1">
                  <Link
                    href={`/members/${member.userId}`}
                    className="block truncate text-[12px] font-bold text-drift-text-primary hover:text-drift-primary"
                  >
                    {memberName(member)}
                  </Link>
                  <small className="mt-[3px] block truncate text-[11px] text-drift-text-secondary">
                    {member.email}
                  </small>
                </div>
                <span className="min-w-[110px] text-[11px] text-drift-text-secondary">
                  {t("members.requestedOn", { date: formatDate(member.joinedAt) })}
                </span>
                <div className="flex gap-[7px]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-w-[72px]"
                    onClick={() => void handleApproval(member, false)}
                  >
                    {t("members.decline")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="min-w-[72px]"
                    onClick={() => void handleApproval(member, true)}
                  >
                    <MaterialIcon name="check" className="text-[15px]" />
                    {t("members.approve")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <EmptyState message={t("a.loading2")} />
      ) : directory.length === 0 ? (
        <EmptyState message={t("a.noMembersYet")} />
      ) : (
        <ManagementCard
          title={t("members.directory")}
          subtitle={t("members.count", { count: visible.length })}
          actions={
            <div className="flex flex-wrap gap-2">
              <InlineSearch
                value={query}
                onChange={setQuery}
                placeholder={t("members.searchPlaceholder")}
                className="w-[230px]"
              />
              <FilterSelect
                label={t("members.filterByStatus")}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <option value="ALL">{t("members.allStatuses")}</option>
                {DIRECTORY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </FilterSelect>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed border-collapse">
              <thead>
                <tr>
                  <Th className="w-[37%]">{t("a.member")}</Th>
                  <Th className="w-[23%]">{t("a.role")}</Th>
                  <Th className="w-[13%]">{t("a.status")}</Th>
                  <Th className="w-[15%]">{t("a.joined")}</Th>
                  <Th className="w-[12%] text-right">{t("a.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => (
                  <tr key={member.membershipId} className="transition-colors hover:bg-drift-surface-sunken">
                    <Td className="h-[66px]">
                      <MemberIdentity member={member} />
                    </Td>
                    <Td className="px-[18px]">
                      {canManage ? (
                        <SelectEditControl
                          value={member.role}
                          options={ROLES.map((r) => ({
                            value: r,
                            label: r.replace(/_/g, " "),
                          }))}
                          onSave={(next) => handleRoleChange(member, next as ClubRole)}
                          title={t("a.changeRole")}
                          description={`${memberName(member)} · ${member.email}`}
                          fieldLabel={t("a.role")}
                          confirmLabel={t("a.saveRole")}
                        />
                      ) : (
                        <span className="text-[11px] font-bold uppercase text-drift-text-secondary">
                          {member.role.replace(/_/g, " ")}
                        </span>
                      )}
                    </Td>
                    <Td className="px-[18px]">
                      <StatusBadge status={member.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-drift-text-secondary">
                      {formatDate(member.joinedAt)}
                    </Td>
                    <Td className="px-[18px] text-right">
                      <ActionMenu
                        label={t("members.moreActions", { name: memberName(member) })}
                        items={[
                          {
                            icon: "person",
                            label: t("members.viewProfile"),
                            description: t("members.viewProfileHint"),
                            onSelect: () => router.push(`/members/${member.userId}`),
                          },
                          ...(canManage
                            ? [
                                { divider: true as const },
                                {
                                  icon: "delete",
                                  label: t("members.remove"),
                                  description: t("members.removeHint"),
                                  danger: true,
                                  onSelect: () => void handleRemove(member),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <EmptyState
                bare
                icon="group_off"
                title={t("members.noMatches")}
                description={t("members.noMatchesHint")}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("ALL");
                    }}
                  >
                    {t("members.clearFilters")}
                  </Button>
                }
              />
            )}
          </div>
          <div className="flex min-h-[58px] items-center bg-drift-surface-sunken text-[11px] text-drift-text-secondary">
            {t("members.showing", { shown: visible.length, total: directory.length })}
          </div>
        </ManagementCard>
      )}
    </div>
  );
}

function MemberIdentity({ member }: { member: Member }) {
  return (
    <div className="flex min-w-0 items-center gap-[11px]">
      <InitialsAvatar name={memberName(member)} tone="auto" />
      <div className="min-w-0">
        <Link
          href={`/members/${member.userId}`}
          className="block truncate text-[12px] font-bold text-drift-text-primary hover:text-drift-primary"
        >
          {memberName(member)}
        </Link>
        <div className="mt-[3px] truncate text-[11px] text-drift-text-secondary">
          {member.email}
        </div>
      </div>
    </div>
  );
}
