"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { SelectEditControl } from "@/components/EditFieldModal";
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

function formatRole(role: string) {
  return role.replace(/_/g, " ");
}

export default function MemberDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { clubId, role: myRole } = useClub();
  const router = useRouter();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!clubId) return;
    try {
      const response = await api.get<{ members: Member[] }>(
        `/clubs/${clubId}/members`,
      );
      setMembers(response.members);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Member details could not be loaded.",
      );
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const member = useMemo(
    () => members?.find((item) => item.userId === userId) ?? null,
    [members, userId],
  );

  async function handleRoleChange(next: ClubRole) {
    if (!clubId || !member) return;
    setError(null);
    await api.patch(`/clubs/${clubId}/members/${member.membershipId}`, {
      role: next,
    });
    await load();
  }

  async function handleRemove() {
    if (!clubId || !member) return;
    if (!window.confirm(`Remove ${memberName(member)} from this club?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/clubs/${clubId}/members/${member.membershipId}`);
      router.push("/members");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "The member could not be removed.",
      );
      setBusy(false);
    }
  }

  if (!members && !error) {
    return <EmptyState message="Loading..." />;
  }

  return (
    <div>
      <PageHeader
        title={member ? memberName(member) : "Member"}
        description="Club membership profile and access."
        action={
          <Link href="/members">
            <Button variant="secondary">
              <MaterialIcon name="arrow_back" className="text-[16px]" />
              All members
            </Button>
          </Link>
        }
      />
      <ErrorBanner message={error} />

      {!member ? (
        <EmptyState message="Member not found." />
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <InitialsAvatar
                  name={memberName(member)}
                  className="h-14 w-14 text-[16px]"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="truncate text-xl font-extrabold text-drift-text-primary">
                      {memberName(member)}
                    </h2>
                    <StatusBadge status={member.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-drift-text-secondary">
                    {member.email}
                  </p>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <SelectEditControl
                    value={member.role}
                    options={ROLES.map((r) => ({
                      value: r,
                      label: formatRole(r),
                    }))}
                    onSave={(next) => handleRoleChange(next as ClubRole)}
                    title="Change role"
                    description={`${memberName(member)} · ${member.email}`}
                    fieldLabel="Role"
                    confirmLabel="Save role"
                  />
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void handleRemove()}
                  >
                    {busy ? "Removing…" : "Remove member"}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailTile label="Role" value={formatRole(member.role)} />
            <DetailTile label="Membership" value={formatRole(member.status)} />
            <DetailTile
              label="Joined"
              value={new Date(member.joinedAt).toLocaleDateString()}
            />
            <DetailTile label="User ID" value={member.userId} mono />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Card>
      <dt className="text-[11.5px] font-bold uppercase tracking-wide text-drift-text-secondary">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-sm font-bold text-drift-text-primary ${
          mono ? "break-all font-mono text-[12.5px]" : ""
        }`}
      >
        {value}
      </dd>
    </Card>
  );
}
