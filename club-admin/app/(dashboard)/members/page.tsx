"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { DataTable } from "@/components/DataTable";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar, MaterialIcon, ModalShell } from "@/components/dashboard-design";
import { SelectEditControl } from "@/components/EditFieldModal";
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

function memberName(member: Member) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email;
}

export default function MembersPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

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
          reason: err instanceof ApiError ? err.message : "could not be invited",
        });
      }
    }
    setImportResult({ invited, failed });
    setImporting(false);
    await loadMembers();
  }

  async function handleRoleChange(membershipId: string, role: ClubRole) {
    if (!clubId) return;
    setError(null);
    await api.patch(`/clubs/${clubId}/members/${membershipId}`, { role });
    await loadMembers();
  }

  async function handleRemove(membershipId: string) {
    if (!clubId) return;
    setError(null);
    try {
      await api.delete(`/clubs/${clubId}/members/${membershipId}`);
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }

  async function handleApproval(membershipId: string, approve: boolean) {
    if (!clubId) return;
    setError(null);
    try {
      if (approve) {
        await api.patch(`/clubs/${clubId}/members/${membershipId}`, {
          status: "ACTIVE",
        });
      } else {
        await api.delete(`/clubs/${clubId}/members/${membershipId}`);
      }
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }

  const pending = members.filter((m) => m.status === "PENDING");
  const active = members.filter((m) => m.status !== "PENDING");

  return (
    <div>
      <PageHeader
        title={t("a.members")}
        description={t("a.everyoneWithAdminAccessTo")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void handleExport()}>
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
                Import CSV
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setShowInvite(true)}>
                <MaterialIcon name="person_add" className="text-[18px]" />{t("a.inviteMember")}</Button>
            )}
          </div>
        }
      />
      <ErrorBanner message={error} />

      {showImport && (
        <ModalShell title={t("a.importMembersFromCsv")} onClose={() => setShowImport(false)}>
          {importResult ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-drift-text-primary">
                <span className="font-bold text-drift-success">
                  {importResult.invited} invited
                </span>
                {importResult.failed.length > 0 && (
                  <>
                    {" · "}
                    <span className="font-bold text-drift-error">
                      {importResult.failed.length} skipped
                    </span>
                  </>
                )}
              </p>
              {importResult.failed.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-md border border-drift-border">
                  {importResult.failed.map((f) => (
                    <div
                      key={f.email}
                      className="border-b border-drift-border px-3 py-2 text-[13px] last:border-b-0"
                    >
                      <span className="font-semibold text-drift-text-primary">
                        {f.email}
                      </span>{" "}
                      <span className="text-drift-text-secondary">— {f.reason}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setShowImport(false)}>{t("a.done")}</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleImport} className="flex flex-col gap-4">
              <p className="text-[13px] text-drift-text-secondary">
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
              <label className="text-[13px] font-semibold text-drift-primary">
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
              <div className="mt-1 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowImport(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={importing || !importText.trim()}>
                  {importing ? t("a.importing") : t("a.importMembers")}
                </Button>
              </div>
            </form>
          )}
        </ModalShell>
      )}

      {showInvite && (
        <ModalShell title={t("a.inviteAMember")} onClose={() => setShowInvite(false)}>
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
            <p className="text-[12.5px] text-drift-text-secondary">
              {t("a.theyJoinWithReadOnly")}
            </p>
            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? t("a.inviting") : t("a.invite")}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {canManage && pending.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-drift-text-primary">
            Join requests ({pending.length})
          </h2>
          <DataTable
            rows={pending}
            rowKey={(member) => member.membershipId}
            columns={[
              {
                header: t("a.member"),
                cell: (member) => (
                  <MemberIdentity member={member} avatarClassName="h-9 w-9" />
                ),
              },
              {
                header: t("a.requested"),
                cell: (member) => formatDate(member.joinedAt),
              },
              {
                header: t("a.status"),
                cell: (member) => <StatusBadge status={member.status} />,
              },
              {
                header: t("a.actions"),
                className: "text-right",
                cell: (member) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleApproval(member.membershipId, true)}
                      className="border-drift-success/20 text-drift-success"
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleApproval(member.membershipId, false)}
                      className="border-drift-error/20 text-drift-error"
                    >
                      Decline
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {loading ? (
        <EmptyState message={t("a.loading2")} />
      ) : active.length === 0 ? (
        <EmptyState message={t("a.noMembersYet")} />
      ) : (
        <DataTable
          rows={active}
          rowKey={(member) => member.membershipId}
          columns={[
            {
              header: t("a.member"),
              cell: (member) => <MemberIdentity member={member} />,
            },
            {
              header: t("a.role"),
              cell: (member) =>
                canManage ? (
                  <SelectEditControl
                    value={member.role}
                    options={ROLES.map((r) => ({
                      value: r,
                      label: r.replace(/_/g, " "),
                    }))}
                    onSave={(next) =>
                      handleRoleChange(member.membershipId, next as ClubRole)
                    }
                    title={t("a.changeRole")}
                    description={`${memberName(member)} · ${member.email}`}
                    fieldLabel={t("a.role")}
                    confirmLabel={t("a.saveRole")}
                  />
                ) : (
                  <span className="text-sm font-semibold text-drift-text-primary">
                    {member.role.replace(/_/g, " ")}
                  </span>
                ),
            },
            {
              header: t("a.status"),
              cell: (member) => <StatusBadge status={member.status} />,
            },
            {
              header: t("a.joined"),
              cell: (member) => formatDate(member.joinedAt),
            },
            {
              header: t("a.actions"),
              className: "text-right",
              cell: (member) =>
                canManage ? (
                  <button
                    type="button"
                    onClick={() => void handleRemove(member.membershipId)}
                    aria-label={`Remove ${memberName(member)}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-drift-text-secondary hover:bg-drift-error-surface hover:text-drift-error focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary"
                  >
                    <MaterialIcon name="delete" className="text-[19px]" />
                  </button>
                ) : (
                  <span className="text-sm text-drift-text-secondary">-</span>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}

function MemberIdentity({
  member,
  avatarClassName,
}: {
  member: Member;
  avatarClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <InitialsAvatar name={memberName(member)} className={avatarClassName} />
      <div className="min-w-0">
        <Link
          href={`/members/${member.userId}`}
          className="block truncate text-[13.5px] font-bold text-drift-text-primary hover:text-drift-primary focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-drift-primary"
        >
          {memberName(member)}
        </Link>
        <div className="truncate text-xs text-drift-text-secondary">
          {member.email}
        </div>
      </div>
    </div>
  );
}
