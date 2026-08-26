"use client";

import { useEffect, useState } from "react";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import type { ClubRole, Member } from "@/lib/types";

const ROLES: ClubRole[] = [
  "OWNER",
  "ADMIN",
  "COMPETITION_MANAGER",
  "COACH",
  "CONTENT_MANAGER",
  "READ_ONLY",
];

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

  // Players who asked to join from the mobile app. Approving is just a
  // status flip through the same endpoint role changes already use.
  const pending = members.filter((m) => m.status === "PENDING");
  const active = members.filter((m) => m.status !== "PENDING");

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

  return (
    <div>
      <PageHeader
        title="Members"
        description="Everyone with admin access to this club."
        action={<Button variant="secondary" onClick={() => void handleExport()}>Export CSV</Button>}
      />
      <ErrorBanner message={error} />

      {canManage && pending.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-drift-text-primary">
            Join requests ({pending.length})
          </h2>
          <DataTable
            rows={pending}
            rowKey={(m) => m.membershipId}
            emptyMessage="No pending requests."
            columns={[
              {
                header: "Name",
                cell: (m) =>
                  `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—",
              },
              { header: "Email", cell: (m) => m.email },
              {
                header: "",
                cell: (m) => (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproval(m.membershipId, true)}
                      className="text-sm font-semibold text-drift-primary hover:underline"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(m.membershipId, false)}
                      className="text-sm font-semibold text-drift-error hover:underline"
                    >
                      Decline
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {canManage && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-drift-text-primary">
            Invite a member
          </h2>
          <form
            onSubmit={handleInvite}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Field label="Email">
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Must already have a Drift account"
                />
              </Field>
            </div>
            <div className="w-full sm:w-48">
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
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? "Inviting…" : "Invite"}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <DataTable
          rows={active}
          rowKey={(m) => m.membershipId}
          emptyMessage="No members yet."
          columns={[
            {
              header: "Name",
              cell: (m) =>
                `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—",
            },
            { header: "Email", cell: (m) => m.email },
            {
              header: "Role",
              cell: (m) =>
                canManage ? (
                  <Select
                    value={m.role}
                    onChange={(e) =>
                      handleRoleChange(m.membershipId, e.target.value as ClubRole)
                    }
                    className="max-w-[180px]"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                ) : (
                  m.role.replace(/_/g, " ")
                ),
            },
            { header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
            {
              header: "",
              cell: (m) =>
                canManage ? (
                  <button
                    onClick={() => handleRemove(m.membershipId)}
                    className="text-sm font-semibold text-drift-error hover:underline"
                  >
                    Remove
                  </button>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  );
}
