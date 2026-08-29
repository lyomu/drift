"use client";

import { useEffect, useState } from "react";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar, MaterialIcon, RowCard } from "@/components/dashboard-design";
import type { ClubRole, Member } from "@/lib/types";

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
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ClubRole>("READ_ONLY");
  const [inviting, setInviting] = useState(false);

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
        role: inviteRole,
      });
      setInviteEmail("");
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
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
      setError(err instanceof ApiError ? err.message : "Member export failed. Try again.");
    }
  }

  async function handleRoleChange(membershipId: string, role: ClubRole) {
    if (!clubId) return;
    setError(null);
    try {
      await api.patch(`/clubs/${clubId}/members/${membershipId}`, { role });
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleRemove(membershipId: string) {
    if (!clubId) return;
    setError(null);
    try {
      await api.delete(`/clubs/${clubId}/members/${membershipId}`);
      await loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
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
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const pending = members.filter((m) => m.status === "PENDING");
  const active = members.filter((m) => m.status !== "PENDING");

  return (
    <div>
      <PageHeader
        title="Members"
        description="Everyone with admin access to this club."
        action={
          <Button variant="secondary" onClick={() => void handleExport()}>
            Export CSV
          </Button>
        }
      />
      <ErrorBanner message={error} />

      {canManage && pending.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-drift-text-primary">
            Join requests ({pending.length})
          </h2>
          <div className="flex flex-col gap-2">
            {pending.map((member) => (
              <RowCard key={member.membershipId} className="flex items-center gap-3">
                <InitialsAvatar name={memberName(member)} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-drift-text-primary">
                    {memberName(member)}
                  </div>
                  <div className="text-xs text-drift-text-secondary">{member.email}</div>
                </div>
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
              </RowCard>
            ))}
          </div>
        </Card>
      )}

      {canManage && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-drift-text-primary">
            Invite a member
          </h2>
          <form
            onSubmit={handleInvite}
            className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-end"
          >
            <Field label="Email">
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Must already have a Drift account"
              />
            </Field>
            <Field label="Role">
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as ClubRole)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" disabled={inviting}>
              {inviting ? "Inviting..." : "Invite"}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <EmptyState message="Loading..." />
      ) : active.length === 0 ? (
        <EmptyState message="No members yet." />
      ) : (
        <Card className="p-2">
          <div className="flex flex-col">
            {active.map((member) => (
              <RowCard
                key={member.membershipId}
                className="flex items-center gap-3.5"
              >
                <InitialsAvatar name={memberName(member)} />
                <div className="min-w-0 flex-[1.2]">
                  <div className="truncate text-[13.5px] font-bold text-drift-text-primary">
                    {memberName(member)}
                  </div>
                  <div className="truncate text-xs text-drift-text-secondary">
                    {member.email}
                  </div>
                </div>
                <div className="min-w-0 flex-1 text-[12.5px] text-drift-text-secondary">
                  {canManage ? (
                    <Select
                      value={member.role}
                      onChange={(e) =>
                        void handleRoleChange(member.membershipId, e.target.value as ClubRole)
                      }
                      className="max-w-[190px]"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    member.role.replace(/_/g, " ")
                  )}
                </div>
                <StatusBadge status={member.status} />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => void handleRemove(member.membershipId)}
                    aria-label={`Remove ${memberName(member)}`}
                    className="shrink-0 text-drift-text-secondary hover:text-drift-error"
                  >
                    <MaterialIcon name="delete" className="text-[19px]" />
                  </button>
                )}
              </RowCard>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
