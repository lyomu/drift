"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { DefinitionList, ModalShell, Panel } from "@/components/dashboard-design";
import { PhoneNumberField } from "@/components/PhoneNumberField";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Textarea, statusTone } from "@/components/ui";
import type { CurrentPlatformAdmin } from "@/lib/access-types";
import { api, ApiError } from "@/lib/api-client";
import {
  CLUB_ROLES,
  MEMBERSHIP_STATUSES,
  USER_CATEGORY_LABEL,
  actionLabel,
  displayName,
  formatDate,
  formatDateTime,
  formatLastActive,
  type ClubMembershipStatus,
  type UserAuditEvent,
  type UserDetail,
  type UserMatch,
  type UserMembership,
  type UserVerificationStatus,
} from "@/lib/user-types";
import type { ClubRole } from "@/lib/organization-types";

type TabKey = "overview" | "activity" | "clubs" | "subscription" | "security" | "history";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "activity", label: "Tennis activity" },
  { key: "clubs", label: "Clubs & coaching" },
  { key: "subscription", label: "Subscription" },
  { key: "security", label: "Security" },
  { key: "history", label: "Admin history" },
];

const VERIFICATION_OPTIONS: UserVerificationStatus[] = ["UNVERIFIED", "PENDING", "VERIFIED", "RESTRICTED"];

const label = (value: string) => value.replaceAll("_", " ").toLowerCase();

type Pending =
  | { kind: "suspend" }
  | { kind: "reactivate" }
  | { kind: "revoke" }
  | { kind: "reset" }
  | { kind: "delete" }
  | { kind: "restore" }
  | { kind: "verification"; status: UserVerificationStatus }
  | { kind: "coachListing"; suspended: boolean }
  | { kind: "membership"; clubId: string; clubName: string; role: ClubRole; status: ClubMembershipStatus; isNew: boolean }
  | { kind: "removeMembership"; membership: UserMembership };

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [admin, setAdmin] = useState<CurrentPlatformAdmin | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ user: UserDetail }>(`/users/${userId}`);
      setUser(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load this user.");
    }
  }, [userId]);

  useEffect(() => {
    void load();
    api.get<CurrentPlatformAdmin>("/auth/me").then(setAdmin).catch(() => setAdmin(null));
  }, [load]);

  // Server-side checks are authoritative; this only decides what to offer.
  const canManageOwners = admin?.role.permissions.includes("ACCESS_MANAGE") ?? false;
  const deleted = user?.accountStatus === "DELETED";
  const suspended = user?.accountStatus === "SUSPENDED";

  async function execute(action: Pending, reason: string) {
    if (!user) return;
    const base = `/users/${user.id}`;
    switch (action.kind) {
      case "suspend":
        await api.patch(`${base}/status`, { status: "SUSPENDED", reason });
        setNotice("Account suspended and signed out everywhere.");
        break;
      case "reactivate":
        await api.patch(`${base}/status`, { status: "ACTIVE", reason });
        setNotice("Account reactivated.");
        break;
      case "revoke": {
        const res = await api.post<{ revokedTokens: number }>(`${base}/revoke-sessions`, { reason });
        setNotice(`Signed out of ${res.revokedTokens} session${res.revokedTokens === 1 ? "" : "s"}.`);
        break;
      }
      case "reset":
        await api.post(`${base}/password-reset`, { reason });
        setNotice("Password reset requested. The user receives a code by email; you never see it.");
        break;
      case "delete":
        await api.post(`${base}/delete`, { reason });
        setNotice("Account deactivated. Permanent erasure runs after the 30-day retention window.");
        break;
      case "restore":
        await api.post(`${base}/restore`, { reason });
        setNotice("Account restored and the pending erasure was withdrawn.");
        break;
      case "verification":
        await api.patch(`${base}/verification`, { status: action.status, reason });
        setNotice("Verification updated.");
        break;
      case "coachListing":
        await api.patch(`${base}/coach-listing`, { suspended: action.suspended, reason });
        setNotice(action.suspended ? "Coach listing hidden from Discover." : "Coach listing reinstated.");
        break;
      case "membership":
        await api.put(`${base}/club-memberships/${action.clubId}`, { role: action.role, status: action.status, reason });
        setNotice("Club membership saved.");
        break;
      case "removeMembership":
        await api.post(`${base}/club-memberships/${action.membership.clubId}/remove`, { reason });
        setNotice("Club membership removed.");
        break;
    }
    await load();
  }

  if (!user) {
    return (
      <div>
        <BackLink />
        <ErrorBanner message={error} />
        {!error && <EmptyState message="Loading user..." icon="hourglass_empty" />}
      </div>
    );
  }

  return (
    <div>
      <BackLink />

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold leading-9 text-drift-text-primary">{displayName(user)}</h1>
          <p className="mt-0.5 break-all text-sm text-drift-text-secondary">{user.email ?? "No email on file"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={statusTone(user.accountStatus)}>{user.accountStatus}</Badge>
            <Badge tone={statusTone(user.verificationStatus)}>{label(user.verificationStatus)}</Badge>
            {user.categories.map((cat) => (
              <Badge key={cat} tone="info">{USER_CATEGORY_LABEL[cat]}</Badge>
            ))}
            {user.coachProfile?.listingSuspendedAt && <Badge tone="warning">Coach listing hidden</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!deleted && (
            <>
              <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>Edit profile</Button>
              <Button variant="secondary" icon="logout" disabled={user.security.activeSessions === 0} onClick={() => setPending({ kind: "revoke" })}>
                Sign out everywhere
              </Button>
              {suspended ? (
                <Button variant="secondary" icon="restart_alt" onClick={() => setPending({ kind: "reactivate" })}>Reactivate</Button>
              ) : (
                <Button variant="destructive" icon="block" onClick={() => setPending({ kind: "suspend" })}>Suspend</Button>
              )}
            </>
          )}
        </div>
      </header>

      <ErrorBanner message={error} />
      {notice && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm font-semibold text-drift-success">
          <span>{notice}</span>
          <button type="button" className="font-bold underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div role="tablist" aria-label="User sections" className="mb-4 flex gap-1 overflow-x-auto border-b border-drift-border">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            id={`tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`panel-${item.key}`}
            onClick={() => setTab(item.key)}
            onKeyDown={(event) => {
              const index = TABS.findIndex((t) => t.key === tab);
              const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : null;
              if (next === null) return;
              event.preventDefault();
              const target = TABS[(next + TABS.length) % TABS.length];
              setTab(target.key);
              document.getElementById(`tab-${target.key}`)?.focus();
            }}
            tabIndex={tab === item.key ? 0 : -1}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary ${
              tab === item.key
                ? "border-drift-primary text-drift-primary-dark"
                : "border-transparent text-drift-text-secondary hover:text-drift-text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <OverviewTab user={user} deleted={deleted} onVerification={(status) => setPending({ kind: "verification", status })} />}
        {tab === "activity" && <ActivityTab user={user} />}
        {tab === "clubs" && (
          <ClubsTab
            user={user}
            deleted={deleted}
            canManageOwners={canManageOwners}
            onMembership={(m) => setPending({ kind: "membership", ...m })}
            onRemove={(membership) => setPending({ kind: "removeMembership", membership })}
            onCoachListing={(suspended) => setPending({ kind: "coachListing", suspended })}
          />
        )}
        {tab === "subscription" && <SubscriptionTab user={user} />}
        {tab === "security" && (
          <SecurityTab
            user={user}
            deleted={deleted}
            onReset={() => setPending({ kind: "reset" })}
            onRevoke={() => setPending({ kind: "revoke" })}
            onDelete={() => setPending({ kind: "delete" })}
            onRestore={() => setPending({ kind: "restore" })}
          />
        )}
        {tab === "history" && <HistoryTab userId={user.id} refreshKey={user.accountStatus + user.verificationStatus + user.clubMemberships.length + String(user.coachProfile?.listingSuspendedAt)} />}
      </div>

      {editing && (
        <EditProfileDialog
          user={user}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setNotice("Profile updated.");
            await load();
          }}
        />
      )}

      {pending && (
        <ActionDialog
          pending={pending}
          user={user}
          canManageOwners={canManageOwners}
          onClose={() => setPending(null)}
          onConfirm={(action, reason) => execute(action, reason)}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/users" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-drift-primary-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">
      ← All users
    </Link>
  );
}

// ------------------------------------------------------------------ dialogs

function ActionDialog({
  pending,
  user,
  canManageOwners,
  onClose,
  onConfirm,
}: {
  pending: Pending;
  user: UserDetail;
  canManageOwners: boolean;
  onClose: () => void;
  onConfirm: (action: Pending, reason: string) => Promise<void>;
}) {
  const name = displayName(user);
  const [membership, setMembership] = useState(
    pending.kind === "membership" ? { role: pending.role, status: pending.status } : { role: "ADMIN" as ClubRole, status: "ACTIVE" as ClubMembershipStatus },
  );

  const copy: Record<Pending["kind"], { title: string; confirm: string; destructive?: boolean; lines: string[] }> = {
    suspend: {
      title: `Suspend ${name}?`,
      confirm: "Suspend account",
      destructive: true,
      lines: [
        "They are blocked from signing in and every live session is revoked immediately.",
        "Their data, subscription, matches and club memberships are kept unchanged.",
      ],
    },
    reactivate: { title: `Reactivate ${name}?`, confirm: "Reactivate", lines: ["They can sign in again. Nothing was removed while suspended."] },
    revoke: { title: "Sign out everywhere?", confirm: "Sign out", lines: ["Every device is signed out and must log in again. The account stays active."] },
    reset: {
      title: "Send a password reset?",
      confirm: "Send reset email",
      lines: [`A one-time code is emailed to ${user.email ?? "the user"}. You never see or set the password.`],
    },
    delete: {
      title: `Delete ${name}?`,
      confirm: "Delete account",
      destructive: true,
      lines: [
        "The account is deactivated and signed out now.",
        "Personal data is permanently anonymised after a 30-day retention window. Until then you can restore it.",
      ],
    },
    restore: { title: `Restore ${name}?`, confirm: "Restore account", lines: ["The account is reactivated and the scheduled erasure is withdrawn."] },
    verification: {
      title: "Change identity verification?",
      confirm: "Update verification",
      lines: [pending.kind === "verification" ? `Set to ${label(pending.status)}.` : ""],
    },
    coachListing: {
      title: pending.kind === "coachListing" && pending.suspended ? "Hide coach listing?" : "Reinstate coach listing?",
      confirm: pending.kind === "coachListing" && pending.suspended ? "Hide listing" : "Reinstate listing",
      destructive: pending.kind === "coachListing" && pending.suspended,
      lines:
        pending.kind === "coachListing" && pending.suspended
          ? ["The coach disappears from Discover and public profiles. Their account, sign-in and profile data are unchanged."]
          : ["The coach appears in Discover again."],
    },
    membership: {
      title: pending.kind === "membership" ? `${pending.isNew ? "Add to" : "Update"} ${pending.clubName}` : "",
      confirm: "Save membership",
      lines: ["Changes only this person's role at this club. Platform permissions are separate and are not affected."],
    },
    removeMembership: {
      title: pending.kind === "removeMembership" ? `Remove from ${pending.membership.clubName}?` : "",
      confirm: "Remove membership",
      destructive: true,
      lines: ["They lose access to this club. Their account and everything else stays."],
    },
  };
  const c = copy[pending.kind];

  const ownerBlocked =
    pending.kind === "membership" &&
    !canManageOwners &&
    (membership.role === "OWNER" || pending.role === "OWNER");

  return (
    <ConfirmActionDialog
      title={c.title}
      consequences={c.lines.filter(Boolean)}
      confirmLabel={c.confirm}
      destructive={c.destructive}
      onClose={onClose}
      onConfirm={(reason) =>
        onConfirm(pending.kind === "membership" ? { ...pending, ...membership } : pending, reason)
      }
    >
      {pending.kind === "membership" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Club role">
            <Select value={membership.role} onChange={(e) => setMembership((m) => ({ ...m, role: e.target.value as ClubRole }))}>
              {CLUB_ROLES.map((role) => (
                <option key={role} value={role} disabled={role === "OWNER" && !canManageOwners && pending.role !== "OWNER"}>
                  {label(role)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Membership status">
            <Select value={membership.status} onChange={(e) => setMembership((m) => ({ ...m, status: e.target.value as ClubMembershipStatus }))}>
              {MEMBERSHIP_STATUSES.map((status) => (
                <option key={status} value={status}>{label(status)}</option>
              ))}
            </Select>
          </Field>
          {ownerBlocked && (
            <p role="note" className="text-sm font-semibold text-drift-warning sm:col-span-2">
              Changing a club owner requires the access-management permission. The server will refuse this change.
            </p>
          )}
        </div>
      )}
    </ConfirmActionDialog>
  );
}

function EditProfileDialog({ user, onClose, onSaved }: { user: UserDetail; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    phoneOnWhatsApp: user.phoneOnWhatsApp,
    reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = !form.firstName.trim() || !form.lastName.trim();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/users/${user.id}/profile`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone || null,
        bio: form.bio || null,
        phoneOnWhatsApp: form.phoneOnWhatsApp,
        ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The profile could not be saved.");
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Edit profile"
      description="Personal details are edited only to correct errors or fulfil a user request. Every change is audited."
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button disabled={busy || invalid} onClick={() => void save()}>{busy ? "Saving..." : "Save profile"}</Button>
        </>
      }
    >
      <ErrorBanner message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name"><Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></Field>
        <Field label="Last name"><Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></Field>
        <Field label="Phone"><PhoneNumberField value={form.phone} onChange={(phone) => setForm((f) => ({ ...f, phone }))} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
          <input type="checkbox" checked={form.phoneOnWhatsApp} onChange={(e) => setForm((f) => ({ ...f, phoneOnWhatsApp: e.target.checked }))} />
          WhatsApp reachable
        </label>
        <div className="sm:col-span-2"><Field label="Bio"><Textarea rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></Field></div>
        <div className="sm:col-span-2"><Field label="Note for the audit log (optional)"><Input maxLength={500} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></Field></div>
      </div>
    </ModalShell>
  );
}

// --------------------------------------------------------------------- tabs

function OverviewTab({ user, deleted, onVerification }: { user: UserDetail; deleted: boolean; onVerification: (status: UserVerificationStatus) => void }) {
  const [verification, setVerification] = useState(user.verificationStatus);
  useEffect(() => setVerification(user.verificationStatus), [user.verificationStatus]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Profile</h2>
        <DefinitionList
          rows={[
            { label: "Email", value: user.email ?? "-" },
            { label: "Phone", value: user.phone ? `${user.phone}${user.phoneOnWhatsApp ? " · WhatsApp" : ""}` : "-" },
            { label: "Joined", value: formatDate(user.createdAt) },
            { label: "Last active", value: formatLastActive(user.lastActiveAt) },
            { label: "Onboarding", value: label(user.onboardingStep) },
            { label: "Location", value: user.tennisProfile?.generalLocation ?? "-" },
          ]}
        />
        {user.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-drift-text-secondary">{user.bio}</p>}
      </Panel>
      <Panel className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Standing</h2>
        <DefinitionList
          rows={[
            { label: "Matches", value: user.stats.matches },
            { label: "Connections", value: user.stats.connections },
            { label: "Reports received", value: user.stats.reportsReceived },
            { label: "Tennis rating (S / D)", value: `${user.tennisProfile?.singlesRating ?? "-"} / ${user.tennisProfile?.doublesRating ?? "-"}` },
          ]}
        />
        {!deleted && (
          <div className="mt-5 flex items-end gap-2">
            <div className="flex-1">
              <Field label="Identity verification">
                <Select value={verification} onChange={(e) => setVerification(e.target.value as UserVerificationStatus)}>
                  {VERIFICATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>{label(option)}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button variant="secondary" disabled={verification === user.verificationStatus} onClick={() => onVerification(verification)}>
              Update
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ActivityTab({ user }: { user: UserDetail }) {
  const [matches, setMatches] = useState<UserMatch[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (skip: number) => {
    const res = await api.get<{ total: number; matches: UserMatch[] }>(`/users/${user.id}/matches?take=20&skip=${skip}`);
    setTotal(res.total);
    return res.matches;
  }, [user.id]);

  useEffect(() => {
    fetchPage(0).then(setMatches).catch((err) => setError(err instanceof ApiError ? err.message : "Matches could not be loaded."));
  }, [fetchPage]);

  async function more() {
    if (!matches) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(matches.length);
      setMatches([...matches, ...next]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Matches could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="grid gap-4">
      <ErrorBanner message={error} />
      <Panel className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Goals</h2>
        {user.goals.length === 0 ? (
          <p className="text-sm text-drift-text-secondary">No goals set.</p>
        ) : (
          <ul className="grid gap-2">
            {user.goals.map((goal) => (
              <li key={goal.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-drift-border px-3 py-2 text-sm">
                <span className="font-bold capitalize">{label(goal.skill)}{goal.focus ? ` · ${label(goal.focus)}` : ""}</span>
                <span className="text-drift-text-secondary">
                  {goal.baseline} → {goal.target}
                  {goal.deadline ? ` · by ${formatDate(goal.deadline)}` : ""}
                </span>
                <Badge tone={goal.achievedAt ? "success" : "neutral"}>{goal.achievedAt ? "Achieved" : "In progress"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Matches {matches ? `(${total})` : ""}</h2>
        {matches === null && !error && <p className="text-sm text-drift-text-secondary">Loading matches...</p>}
        {matches?.length === 0 && <EmptyState message="No matches yet." icon="sports_tennis" />}
        {matches && matches.length > 0 && (
          <>
            <ul className="grid gap-2">
              {matches.map((match) => (
                <li key={match.id} className="grid gap-1 rounded-md border border-drift-border px-3 py-2 text-sm sm:grid-cols-[1fr_auto]">
                  <div>
                    <span className="font-bold">
                      {match.opponents.length ? `vs ${match.opponents.map((o) => o.name).join(" / ")}` : "Opponent pending"}
                    </span>
                    <span className="text-drift-text-secondary"> · {label(match.sport)} {label(match.format)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-drift-text-secondary">
                    {formatDate(match.playedAt)}
                    <Badge tone={statusTone(match.result?.status ?? match.state)}>{label(match.result?.status ?? match.state)}</Badge>
                  </div>
                </li>
              ))}
            </ul>
            {matches.length < total && (
              <div className="mt-3 flex justify-center">
                <Button variant="secondary" disabled={loadingMore} onClick={() => void more()}>
                  {loadingMore ? "Loading..." : `Load more (${total - matches.length} left)`}
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function ClubsTab({
  user,
  deleted,
  canManageOwners,
  onMembership,
  onRemove,
  onCoachListing,
}: {
  user: UserDetail;
  deleted: boolean;
  canManageOwners: boolean;
  onMembership: (m: { clubId: string; clubName: string; role: ClubRole; status: ClubMembershipStatus; isNew: boolean }) => void;
  onRemove: (m: UserMembership) => void;
  onCoachListing: (suspended: boolean) => void;
}) {
  const coach = user.coachProfile;
  const [newClub, setNewClub] = useState("");
  const clubs = useMemo(() => user.clubMemberships, [user.clubMemberships]);
  return (
    <div className="grid gap-4">
      <Panel className="p-5">
        <h2 className="mb-1 font-display text-lg font-bold">Club memberships</h2>
        <p className="mb-3 text-sm text-drift-text-secondary">
          Club roles are per club. They never grant platform-admin access, which is a separate identity.
        </p>
        {clubs.length === 0 ? (
          <p className="text-sm text-drift-text-secondary">Not a member of any club.</p>
        ) : (
          <ul className="grid gap-2">
            {clubs.map((m) => (
              <li key={m.clubId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-drift-border px-3 py-2 text-sm">
                <div>
                  <Link href={`/organizations/${m.clubId}`} className="font-bold text-drift-primary-dark hover:underline">{m.clubName}</Link>
                  <span className="text-drift-text-secondary"> · joined {formatDate(m.joinedAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{label(m.role)}</Badge>
                  <Badge tone={statusTone(m.status)}>{label(m.status)}</Badge>
                  {!deleted && (
                    <>
                      <Button variant="secondary" disabled={m.role === "OWNER" && !canManageOwners} title={m.role === "OWNER" && !canManageOwners ? "Requires access-management permission" : undefined} onClick={() => onMembership({ clubId: m.clubId, clubName: m.clubName, role: m.role, status: m.status, isNew: false })}>Change</Button>
                      <Button variant="ghost" disabled={m.role === "OWNER" && !canManageOwners} onClick={() => onRemove(m)}>Remove</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!deleted && (
          <form
            className="mt-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const id = newClub.trim();
              if (id) onMembership({ clubId: id, clubName: "this club", role: "READ_ONLY", status: "ACTIVE", isNew: true });
            }}
          >
            <div className="min-w-64 flex-1">
              <Field label="Add to a club (club ID)">
                <Input value={newClub} onChange={(e) => setNewClub(e.target.value)} placeholder="Paste the club ID from the Club List" />
              </Field>
            </div>
            <Button type="submit" variant="secondary" disabled={!newClub.trim()}>Add membership</Button>
          </form>
        )}
      </Panel>

      <Panel className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Coach profile</h2>
        {!coach ? (
          <p className="text-sm text-drift-text-secondary">Not a coach.</p>
        ) : (
          <>
            <DefinitionList
              rows={[
                { label: "Listing verification", value: label(coach.verificationStatus) },
                { label: "Experience", value: coach.yearsExperience != null ? `${coach.yearsExperience} yrs` : "-" },
                { label: "Specialisations", value: coach.specialisations.join(", ") || "-" },
                { label: "Affiliated clubs", value: coach.affiliations.map((a) => a.name).join(", ") || "-" },
                {
                  label: "Public listing",
                  value: coach.listingSuspendedAt ? <Badge tone="warning">Hidden since {formatDate(coach.listingSuspendedAt)}</Badge> : <Badge tone="success">Visible</Badge>,
                },
              ]}
            />
            {coach.listingSuspendedReason && (
              <p className="mt-3 text-sm text-drift-text-secondary">Reason: {coach.listingSuspendedReason}</p>
            )}
            {!deleted && (
              <div className="mt-4">
                <Button variant={coach.listingSuspendedAt ? "secondary" : "destructive"} icon={coach.listingSuspendedAt ? "visibility" : "visibility_off"} onClick={() => onCoachListing(!coach.listingSuspendedAt)}>
                  {coach.listingSuspendedAt ? "Reinstate listing" : "Hide listing"}
                </Button>
                <p className="mt-2 text-xs text-drift-text-secondary">Independent of the user&apos;s account: the coach can still sign in.</p>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function SubscriptionTab({ user }: { user: UserDetail }) {
  const sub = user.subscription;
  return (
    <Panel className="p-5">
      <h2 className="mb-3 font-display text-lg font-bold">Subscription</h2>
      {!sub ? (
        <p className="text-sm text-drift-text-secondary">No paid subscription. This account is on the free tier.</p>
      ) : (
        <DefinitionList
          rows={[
            { label: "Plan", value: sub.plan.name },
            { label: "Status", value: <Badge tone={statusTone(sub.status)}>{label(sub.status)}</Badge> },
            { label: "Price", value: `${new Intl.NumberFormat(undefined, { style: "currency", currency: sub.plan.currency }).format(sub.plan.priceMinor / 100)} / ${label(sub.plan.interval)}` },
            { label: "Current period", value: `${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}` },
          ]}
        />
      )}
      <p className="mt-4 text-xs text-drift-text-secondary">
        Suspending or deleting an account never cancels or alters its subscription. Billing changes happen under Commercial.
      </p>
    </Panel>
  );
}

function SecurityTab({
  user, deleted, onReset, onRevoke, onDelete, onRestore,
}: {
  user: UserDetail; deleted: boolean; onReset: () => void; onRevoke: () => void; onDelete: () => void; onRestore: () => void;
}) {
  const s = user.security;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Sign-in</h2>
        <DefinitionList
          rows={[
            { label: "Password", value: s.hasPassword ? "Set" : "None (social sign-in)" },
            { label: "Social providers", value: s.socialProviders.length ? s.socialProviders.map(label).join(", ") : "-" },
            { label: "Email verified", value: s.emailVerified ? formatDate(user.emailVerifiedAt) : "No" },
            { label: "Phone verified", value: s.phoneVerified ? formatDate(user.phoneVerifiedAt) : "No" },
            { label: "Active sessions", value: s.activeSessions },
            { label: "Registered devices", value: s.registeredDevices },
            { label: "Last active", value: formatDateTime(s.lastActiveAt) === "-" ? "Never recorded" : formatDateTime(s.lastActiveAt) },
          ]}
        />
        <p className="mt-3 text-xs text-drift-text-secondary">Passwords, tokens and device identifiers are never shown.</p>
      </Panel>
      <Panel className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Actions</h2>
        <div className="grid gap-3">
          {!deleted && (
            <>
              <Button variant="secondary" icon="mail_lock" disabled={!user.email || user.accountStatus !== "ACTIVE"} onClick={onReset}>Send password reset email</Button>
              <Button variant="secondary" icon="logout" disabled={s.activeSessions === 0} onClick={onRevoke}>Sign out everywhere</Button>
              <Button variant="destructive" icon="delete" onClick={onDelete}>Delete account…</Button>
              <p className="text-xs text-drift-text-secondary">Deletion deactivates the account and erases personal data after 30 days. It can be restored until then.</p>
            </>
          )}
          {deleted && <Button variant="secondary" icon="restart_alt" onClick={onRestore}>Restore account</Button>}
        </div>
      </Panel>
    </div>
  );
}

function HistoryTab({ userId, refreshKey }: { userId: string; refreshKey: string }) {
  const [events, setEvents] = useState<UserAuditEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (skip: number) => {
    const res = await api.get<{ total: number; events: UserAuditEvent[] }>(`/users/${userId}/audit?take=25&skip=${skip}`);
    setTotal(res.total);
    return res.events;
  }, [userId]);

  useEffect(() => {
    fetchPage(0).then(setEvents).catch((err) => setError(err instanceof ApiError ? err.message : "History could not be loaded."));
  }, [fetchPage, refreshKey]);

  return (
    <Card>
      <h2 className="mb-1 font-display text-lg font-bold">Administrative history</h2>
      <p className="mb-4 text-sm text-drift-text-secondary">Append-only. Entries marked &ldquo;chained&rdquo; are covered by the tamper-evident hash chain.</p>
      <ErrorBanner message={error} />
      {events === null && !error && <p className="text-sm text-drift-text-secondary">Loading history...</p>}
      {events?.length === 0 && <EmptyState message="No administrative actions yet." icon="history" />}
      {events && events.length > 0 && (
        <>
          <ol className="grid gap-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-md border border-drift-border px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{actionLabel(event.action)}</span>
                  <span className="flex items-center gap-2 text-xs text-drift-text-secondary">
                    {formatDateTime(event.createdAt)}
                    {event.chained && <Badge tone="success">chained</Badge>}
                  </span>
                </div>
                <div className="mt-0.5 text-drift-text-secondary">by {event.actor.name ?? event.actor.email}</div>
                {event.reason && <p className="mt-1.5 leading-6">“{event.reason}”</p>}
              </li>
            ))}
          </ol>
          {events.length < total && (
            <div className="mt-3 flex justify-center">
              <Button variant="secondary" onClick={() => void fetchPage(events.length).then((more) => setEvents([...events, ...more]))}>
                Load older ({total - events.length} left)
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
