"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, hasToken, setToken } from "./api-client";
import type { CoachContext, Membership, WorkspaceContexts } from "./types";

/**
 * Club staff and coaches share one login on this origin, so a single call to
 * `GET /auth/me/contexts` decides which workspace opens. This is navigation
 * only: the server re-checks authorization on every request, and holding a
 * context here grants nothing.
 */
export type Workspace = "club" | "coach";

type WorkspaceContextValue = {
  loading: boolean;
  authed: boolean;
  memberships: Membership[];
  coach: CoachContext | null;
  /** True when this account can open both, so the shell offers a switcher. */
  hasBoth: boolean;
  /** Where a bare "/" should land this account. */
  landing: "club" | "coach" | "request-club";
  refresh: () => Promise<void>;
  logout: () => void;
};

const WorkspaceCtx = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [coach, setCoach] = useState<CoachContext | null>(null);

  const refresh = useCallback(async () => {
    if (!hasToken()) {
      setAuthed(false);
      setMemberships([]);
      setCoach(null);
      setLoading(false);
      return;
    }
    setAuthed(true);
    try {
      const res = await api.get<WorkspaceContexts>("/auth/me/contexts");
      setMemberships(res.clubMemberships);
      setCoach(res.coach);
    } catch (err) {
      setMemberships([]);
      setCoach(null);
      // An expired session and "this account has no workspaces" look identical
      // from the outside, so reflect the 401 explicitly — otherwise a logged
      // out user gets a broken-looking empty shell instead of the login page.
      if (err instanceof ApiError && err.status === 401) setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAuthed(false);
    setMemberships([]);
    setCoach(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<WorkspaceContextValue>(() => {
    const hasClub = memberships.length > 0;
    const hasCoach = coach != null;
    return {
      loading,
      authed,
      memberships,
      coach,
      hasBoth: hasClub && hasCoach,
      // Club wins a tie only as a default destination; the switcher still
      // offers the other one. An account with neither is a coach applicant or
      // a club founder, and "/" routes them on from there.
      landing: hasClub ? "club" : hasCoach ? "coach" : "request-club",
      refresh,
      logout,
    };
  }, [loading, authed, memberships, coach, refresh, logout]);

  return (
    <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
