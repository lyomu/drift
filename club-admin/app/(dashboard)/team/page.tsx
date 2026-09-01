"use client";

import { useCallback, useEffect, useState } from "react";
import {
  InitialsAvatar,
  MaterialIcon,
  ModalShell,
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
import { SelectEditControl } from "@/components/EditFieldModal";
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
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);

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
    setError(null);
    setInviting(true);
    try {
      await api.post(`/clubs/${clubId}/members`, { email, role: inviteRole });
      setEmail("");
      setInviteRole("ADMIN");
      setShowInvite(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The administrator could not be invited.");
    } finally {
      setInviting(false);
    }
  }

  async function change(id: string, nextRole: ClubRole) {
    if (!clubId) return;
    setError(null);
    await api.patch(`/clubs/${clubId}/members/${id}`, { role: nextRole });
    await load();
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
        action={
          canManage ? (
            <Button onClick={() => setShowInvite(true)}>
              <MaterialIcon name="person_add" className="text-[18px]" />
              Invite admin
            </Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      {showInvite && (
        <ModalShell title="Invite an admin" onClose={() => setShowInvite(false)}>
          <form onSubmit={invite} className="flex flex-col gap-4">
            <Field label="Existing Drift account email">
              <Input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Must already have a Drift account"
              />
            </Field>
            <Field label="Role">
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as ClubRole)}
              >
                {ADMIN_ROLES.filter((r) => r !== "READ_ONLY").map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Inviting…" : "Invite admin"}
              </Button>
            </div>
          </form>
        </ModalShell>
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
                        <SelectEditControl
                          value={member.role}
                          options={ADMIN_ROLES.map((r) => ({
                            value: r,
                            label: r.replaceAll("_", " "),
                          }))}
                          onSave={(next) =>
                            change(member.membershipId, next as ClubRole)
                          }
                          title="Change role"
                          description={`${memberName(member)} · ${member.email}`}
                          fieldLabel="Role"
                          confirmLabel="Save role"
                        />
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
