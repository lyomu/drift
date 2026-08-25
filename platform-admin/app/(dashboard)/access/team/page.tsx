"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { PlatformInvitation, PlatformRole, PlatformStaff } from "@/lib/access-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

export default function TeamUsersPage() {
  const [admins, setAdmins] = useState<PlatformStaff[] | null>(null);
  const [invitations, setInvitations] = useState<PlatformInvitation[]>([]);
  const [roles, setRoles] = useState<PlatformRole[]>([]);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [teamResult, roleResult] = await Promise.all([
        api.get<{ admins: PlatformStaff[]; invitations: PlatformInvitation[] }>("/access/team"),
        api.get<{ roles: PlatformRole[] }>("/access/roles"),
      ]);
      setAdmins(teamResult.admins);
      setInvitations(teamResult.invitations);
      setRoles(roleResult.roles);
      setRoleId((current) => current || roleResult.roles[0]?.id || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Platform team members could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("invite");
    setError(null);
    try {
      const result = await api.post<{ devInviteUrl?: string }>("/access/team/invitations", { email, roleId });
      setInviteUrl(result.devInviteUrl ?? null);
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The invitation could not be created.");
    } finally {
      setBusyId(null);
    }
  }

  async function update(id: string, body: { roleId?: string; status?: "ACTIVE" | "SUSPENDED" }) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/access/team/${id}`, body);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The team member could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Team users"
        description="Invite internal staff, assign one role, and suspend access without deleting the audit history."
        action={<Button onClick={() => { setShowInvite((value) => !value); setInviteUrl(null); }}>{showInvite ? "Cancel invite" : "Invite staff"}</Button>}
      />
      <ErrorBanner message={error} />
      {showInvite && (
        <Card className="mb-6">
          <form onSubmit={invite} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_240px_auto] sm:items-end">
            <Field label="Staff email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Role">
              <Select required value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </Select>
            </Field>
            <Button type="submit" disabled={busyId === "invite"}>{busyId === "invite" ? "Inviting…" : "Send invite"}</Button>
          </form>
          {inviteUrl && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-drift-primary-light px-4 py-3 text-sm text-drift-primary-dark">
              <span>Development invite created. Share the one-time link securely.</span>
              <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(inviteUrl)}>Copy invite link</Button>
            </div>
          )}
        </Card>
      )}

      {admins === null ? <EmptyState message="Loading…" /> : admins.length === 0 ? <EmptyState message="Invite your first team member" /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px]">
            <thead><tr><Th>Staff member</Th><Th>Role</Th><Th>2FA</Th><Th>Last sign-in</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {admins.map((admin) => {
                const active = !admin.deactivatedAt;
                return <tr key={admin.id}>
                  <Td><div className="font-semibold">{admin.name || "—"}</div><div className="text-drift-text-secondary">{admin.email}</div></Td>
                  <Td><Select value={admin.role.id} disabled={busyId === admin.id} onChange={(e) => void update(admin.id, { roleId: e.target.value })} className="max-w-52">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</Select></Td>
                  <Td><Badge tone={admin.twoFactorEnabled ? "success" : "warning"}>{admin.twoFactorEnabled ? "Required" : "Disabled"}</Badge></Td>
                  <Td>{admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "Never"}</Td>
                  <Td><Badge tone={statusTone(active ? "ACTIVE" : "SUSPENDED")}>{active ? "ACTIVE" : "SUSPENDED"}</Badge></Td>
                  <Td className="text-right"><Button variant={active ? "destructive" : "secondary"} disabled={busyId === admin.id} onClick={() => void update(admin.id, { status: active ? "SUSPENDED" : "ACTIVE" })}>{busyId === admin.id ? "Working…" : active ? "Suspend" : "Restore"}</Button></Td>
                </tr>;
              })}
            </tbody>
          </table>
        </Card>
      )}

      {invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-drift-text-primary">Pending invitations</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[620px]">
              <thead><tr><Th>Email</Th><Th>Role</Th><Th>Invited</Th><Th>Expires</Th></tr></thead>
              <tbody>{invitations.map((invite) => <tr key={invite.id}><Td>{invite.email}</Td><Td>{invite.role.name}</Td><Td>{new Date(invite.createdAt).toLocaleDateString()}</Td><Td><Badge tone={new Date(invite.expiresAt) > new Date() ? "warning" : "error"}>{new Date(invite.expiresAt) > new Date() ? new Date(invite.expiresAt).toLocaleString() : "Expired"}</Badge></Td></tr>)}</tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
