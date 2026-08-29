"use client";

import { useCallback, useEffect, useState } from "react";
import {
  InitialsAvatar,
  MaterialIcon,
  Panel,
  RowCard,
  SectionTitle,
} from "@/components/dashboard-design";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { ClubRole, Member } from "@/lib/types";

const ADMIN_ROLES: ClubRole[] = ["OWNER", "ADMIN", "COMPETITION_MANAGER", "COACH", "CONTENT_MANAGER", "READ_ONLY"];

function memberName(member: Member) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email;
}

export default function TeamPage() {
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ClubRole>("ADMIN");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      setMembers((await api.get<{ members: Member[] }>(`/clubs/${clubId}/members`)).members);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Team roles could not be loaded.");
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    try {
      await api.post(`/clubs/${clubId}/members`, { email, role: inviteRole });
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The administrator could not be invited.");
    }
  }

  async function change(id: string, nextRole: ClubRole) {
    if (!clubId) return;
    try {
      await api.patch(`/clubs/${clubId}/members/${id}`, { role: nextRole });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The role could not be changed.");
    }
  }

  async function remove(id: string) {
    if (!clubId) return;
    try {
      await api.delete(`/clubs/${clubId}/members/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The administrator could not be removed.");
    }
  }

  const team = members?.filter((member) => member.role !== "READ_ONLY") ?? [];

  return (
    <div>
      <PageHeader
        title="Team roles"
        description="Invite administrators and keep operational access aligned with each person's responsibilities."
      />
      <ErrorBanner message={error} />

      {canManage && (
        <Panel className="mb-6">
          <form onSubmit={invite} className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_230px_auto] lg:items-end">
            <Field label="Existing Drift account email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Role">
              <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as ClubRole)}>
                {ADMIN_ROLES.filter((r) => r !== "READ_ONLY").map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit">
              <MaterialIcon name="person_add" className="text-[18px]" />
              Invite admin
            </Button>
          </form>
        </Panel>
      )}

      <Panel>
        <SectionTitle
          title="Administrators"
          action={<span className="text-[13px] font-semibold text-drift-text-secondary">{team.length} people</span>}
        />
        <div className="mt-4">
          {members === null ? (
            <EmptyState message="Loading..." />
          ) : team.length === 0 ? (
            <EmptyState message="No administrators have been added." />
          ) : (
            <div className="space-y-2">
              {team.map((member) => (
                <RowCard key={member.membershipId}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <InitialsAvatar name={memberName(member)} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-drift-text-primary">
                          {memberName(member)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-drift-text-secondary">
                          <MaterialIcon name="admin_panel_settings" className="text-[16px]" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {canManage ? (
                        <Select
                          value={member.role}
                          onChange={(e) => void change(member.membershipId, e.target.value as ClubRole)}
                          className="w-[220px]"
                        >
                          {ADMIN_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.replaceAll("_", " ")}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-sm font-semibold text-drift-text-primary">
                          {member.role.replaceAll("_", " ")}
                        </span>
                      )}
                      <StatusBadge status={member.status} />
                      {canManage && (
                        <Button variant="ghost" onClick={() => void remove(member.membershipId)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </RowCard>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
