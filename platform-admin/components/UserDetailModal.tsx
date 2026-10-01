"use client";

import { useCallback, useEffect, useState } from "react";
import { DefinitionList, ModalShell } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, ErrorBanner, Field, Input, Select, Textarea, statusTone } from "@/components/ui";
import {
  USER_CATEGORY_LABEL,
  displayName,
  type UserDetail,
  type UserVerificationStatus,
  type UserActivityEvent,
} from "@/lib/user-types";

const VERIFICATION_OPTIONS: UserVerificationStatus[] = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "RESTRICTED",
];

function label(value: string) {
  return value.replaceAll("_", " ");
}

function rating(value: number | null | undefined) {
  return value == null ? "-" : value.toFixed(1);
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

/**
 * Read-only context plus the three account actions. Every action re-fetches
 * the detail and calls `onChanged` so the table behind the modal stays in
 * step — the counts in the stat band are server-side totals, so a stale table
 * would otherwise disagree with them.
 */
export function UserDetailModal({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activity, setActivity] = useState<UserActivityEvent[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    phoneOnWhatsApp: false,
  });

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ user: UserDetail }>(`/users/${userId}`);
      setUser(res.user);
      setForm({
        firstName: res.user.firstName ?? "",
        lastName: res.user.lastName ?? "",
        phone: res.user.phone ?? "",
        bio: res.user.bio ?? "",
        phoneOnWhatsApp: res.user.phoneOnWhatsApp ?? false,
      });
      const history = await api.get<{ events: UserActivityEvent[] }>(`/users/${userId}/activity`);
      setActivity(history.events);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load user.");
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      setError(null);
      await action();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }

  }

  async function saveProfile() {
    await run(() =>
      api.patch(`/users/${userId}/profile`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || null,
        bio: form.bio || null,
        phoneOnWhatsApp: form.phoneOnWhatsApp,
      }),
    );
    setEditing(false);
  }

  const deleted = user?.accountStatus === "DELETED";
  const suspended = user?.accountStatus === "SUSPENDED";

  return (
    <ModalShell
      title={user ? displayName(user) : "Loading..."}
      description={user?.email ?? undefined}
      onClose={onClose}
      footer={
        user && !deleted ? (
          <>
            <Button
              variant="secondary"
              icon="logout"
              disabled={busy || user.stats.activeSessions === 0}
              onClick={() =>
                void run(
                  () => api.post(`/users/${user.id}/revoke-sessions`),
                  `Sign ${user.email ?? "this user"} out of all devices?`,
                )
              }
            >
              Force logout
            </Button>
            <Button
              variant="secondary"
              icon="edit"
              disabled={busy}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? "Cancel edit" : "Edit profile"}
            </Button>
            <Button
              variant={suspended ? "secondary" : "destructive"}
              icon={suspended ? "restart_alt" : "block"}
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    api.patch(`/users/${user.id}/status`, {
                      status: suspended ? "ACTIVE" : "SUSPENDED",
                    }),
                  `${suspended ? "Restore" : "Suspend"} ${user.email ?? "this user"}?`,
                )
              }
            >
              {suspended ? "Restore" : "Suspend"}
            </Button>
            <Button
              variant="destructive"
              icon="delete"
              disabled={busy}
              onClick={() =>
                void run(
                  () => api.post(`/users/${user.id}/delete`),
                  `Deactivate ${user.email ?? "this user"}? They will be signed out and hidden from active workflows.`,
                )
              }
            >
              Deactivate
            </Button>
          </>
        ) : user ? (
          <Button
            variant="secondary"
            icon="restart_alt"
            disabled={busy}
            onClick={() =>
              void run(
                () => api.post(`/users/${user.id}/restore`),
                `Restore ${user.email ?? "this user"}?`,
              )
            }
          >
            Restore account
          </Button>
        ) : null
      }
    >
      <ErrorBanner message={error} />

      {!user && !error && (
        <p className="text-sm text-drift-text-secondary">Loading account...</p>
      )}

      {user && (
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(user.accountStatus)}>{user.accountStatus}</Badge>
            <Badge tone={statusTone(user.verificationStatus)}>
              {label(user.verificationStatus)}
            </Badge>
            {user.categories.map((category) => (
              <Badge key={category} tone="info">
                {USER_CATEGORY_LABEL[category]}
              </Badge>
            ))}
          </div>

          {editing && !deleted && (
            <section className="grid gap-3 rounded-lg border border-drift-border bg-drift-neutral-surface p-4">
              <h3 className="font-display text-sm font-bold uppercase text-drift-text-secondary">
                Edit profile
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name">
                  <Input value={form.firstName} onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))} />
                </Field>
                <Field label="Last name">
                  <Input value={form.lastName} onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))} />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                  <input type="checkbox" checked={form.phoneOnWhatsApp} onChange={(e) => setForm((current) => ({ ...current, phoneOnWhatsApp: e.target.checked }))} />
                  WhatsApp reachable
                </label>
              </div>
              <Field label="Bio">
                <Textarea rows={3} value={form.bio} onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))} />
              </Field>
              <div className="flex justify-end">
                <Button variant="primary" disabled={busy || !form.firstName.trim() || !form.lastName.trim()} onClick={() => void saveProfile()}>
                  {busy ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </section>
          )}

          {!deleted && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-bold uppercase text-drift-text-secondary">
                  Identity verification
                </label>
                <Select
                  value={user.verificationStatus}
                  disabled={busy}
                  onChange={(e) =>
                    void run(() =>
                      api.patch(`/users/${user.id}/verification`, {
                        status: e.target.value,
                      }),
                    )
                  }
                >
                  {VERIFICATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {label(option)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <DefinitionList
            rows={[
              { label: "Joined", value: date(user.createdAt) },
              { label: "Onboarding", value: label(user.onboardingStep) },
              { label: "Phone", value: user.phone ?? "-" },
              { label: "Email verified", value: date(user.emailVerifiedAt) },
              { label: "Matches played", value: user.stats.matches },
              { label: "Connections", value: user.stats.connections },
              {
                label: "Reports against them",
                value: user.stats.reportsReceived,
              },
              { label: "Active sessions", value: user.stats.activeSessions },
            ]}
          />

          <section>
            <h3 className="mb-2 font-display text-sm font-bold uppercase text-drift-text-secondary">
              Location & clubs
            </h3>
            <DefinitionList
              rows={[
                {
                  label: "General location",
                  value: user.tennisProfile?.generalLocation ?? "-",
                },
                {
                  label: "Location coordinates",
                  value:
                    user.tennisProfile?.latitude != null &&
                    user.tennisProfile?.longitude != null
                      ? `${user.tennisProfile.latitude.toFixed(5)}, ${user.tennisProfile.longitude.toFixed(5)}`
                      : "-",
                },
                {
                  label: "Preferred club",
                  value: user.tennisProfile?.preferredClubName ?? "-",
                },
                {
                  label: "Club memberships",
                  value:
                    user.clubMemberships.length > 0
                      ? user.clubMemberships.map((membership) => membership.clubName).join(", ")
                      : "-",
                },
              ]}
            />
          </section>

          {(user.tennisProfile || user.padelProfile) && (
            <section>
              <h3 className="mb-2 font-display text-sm font-bold uppercase text-drift-text-secondary">
                Play
              </h3>
              <DefinitionList
                rows={[
                  ...(user.tennisProfile
                    ? [
                        {
                          label: "Tennis (singles / doubles)",
                          value: `${rating(user.tennisProfile.singlesRating)} / ${rating(user.tennisProfile.doublesRating)}`,
                        },
                      ]
                    : []),
                  ...(user.padelProfile
                    ? [
                        {
                          label: "Padel (singles / doubles)",
                          value: `${rating(user.padelProfile.singlesRating)} / ${rating(user.padelProfile.doublesRating)}`,
                        },
                      ]
                    : []),
                ]}
              />
            </section>
          )}

          {user.coachProfile && (
            <section>
              <h3 className="mb-2 font-display text-sm font-bold uppercase text-drift-text-secondary">
                Coaching
              </h3>
              <DefinitionList
                rows={[
                  {
                    label: "Listing status",
                    value: (
                      <Badge tone={statusTone(user.coachProfile.verificationStatus)}>
                        {label(user.coachProfile.verificationStatus)}
                      </Badge>
                    ),
                  },
                  {
                    label: "Experience",
                    value:
                      user.coachProfile.yearsExperience == null
                        ? "-"
                        : `${user.coachProfile.yearsExperience} years`,
                  },
                  {
                    label: "Qualifications",
                    value: user.coachProfile.qualifications.join(", ") || "-",
                  },
                  {
                    label: "Specialisations",
                    value: user.coachProfile.specialisations.join(", ") || "-",
                  },
                  {
                    label: "Affiliated clubs",
                    value:
                      user.coachProfile.affiliations
                        .map((club) => club.name)
                        .join(", ") || "-",
                  },
                ]}
              />
            </section>
          )}

          {user.clubMemberships.length > 0 && (
            <section>
              <h3 className="mb-2 font-display text-sm font-bold uppercase text-drift-text-secondary">
                Club roles
              </h3>
              <DefinitionList
                rows={user.clubMemberships.map((membership) => ({
                  label: membership.clubName,
                  value: `${label(membership.role)} · since ${date(membership.joinedAt)}`,
                }))}
              />
            </section>
          )}

          <section>
            <h3 className="mb-2 font-display text-sm font-bold uppercase text-drift-text-secondary">
              Activity history
            </h3>
            {activity.length === 0 ? (
              <p className="text-sm text-drift-text-secondary">No platform-admin activity recorded.</p>
            ) : (
              <div className="divide-y divide-drift-border rounded-lg border border-drift-border">
                {activity.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                    <div>
                      <div className="font-semibold">{event.action.replaceAll(".", " ")}</div>
                      <div className="text-xs text-drift-text-secondary">
                        by {event.actor.name || event.actor.email}
                      </div>
                    </div>
                    <time className="shrink-0 text-xs text-drift-text-secondary">
                      {new Date(event.createdAt).toLocaleString()}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </ModalShell>
  );
}
