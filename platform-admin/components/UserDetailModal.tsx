"use client";

import { useCallback, useEffect, useState } from "react";
import { DefinitionList, ModalShell } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, ErrorBanner, Select, statusTone } from "@/components/ui";
import {
  USER_CATEGORY_LABEL,
  displayName,
  type UserDetail,
  type UserVerificationStatus,
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

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ user: UserDetail }>(`/users/${userId}`);
      setUser(res.user);
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
          </>
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

          {!deleted && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
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

          {(user.tennisProfile || user.padelProfile) && (
            <section>
              <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
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
              <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
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
              <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
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
        </div>
      )}
    </ModalShell>
  );
}
