"use client";

import { createContext, useContext, useMemo } from "react";
import { useWorkspace } from "./workspace-context";
import type { ClubRole, Membership } from "./types";

/**
 * The club half of the workspace context. This used to own the fetch itself;
 * since coaches and club staff share one login, `WorkspaceProvider` now makes
 * the single `/auth/me/contexts` call and this derives the club view from it.
 *
 * The shape is unchanged on purpose — every existing dashboard page calls
 * `useClub()` and none of them needed to know about the coach workspace.
 */
type ClubContextValue = {
  loading: boolean;
  authed: boolean;
  clubId: string | null;
  clubName: string | null;
  role: ClubRole | null;
  /** false while the owner still has the setup wizard to finish/dismiss. */
  setupComplete: boolean;
  memberships: Membership[];
  refresh: () => Promise<void>;
  logout: () => void;
};

const ClubContext = createContext<ClubContextValue | null>(null);

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { loading, authed, memberships, refresh, logout } = useWorkspace();

  const value = useMemo<ClubContextValue>(() => {
    const primary = memberships[0] ?? null;
    return {
      loading,
      authed,
      clubId: primary?.clubId ?? null,
      clubName: primary?.clubName ?? null,
      role: primary?.role ?? null,
      setupComplete: primary?.setupComplete ?? true,
      memberships,
      refresh,
      logout,
    };
  }, [loading, authed, memberships, refresh, logout]);

  return (
    <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
  );
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used within a ClubProvider");
  return ctx;
}
