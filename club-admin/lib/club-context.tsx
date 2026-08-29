"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, hasToken, setToken } from "./api-client";
import type { ClubRole, Membership } from "./types";

type ClubContextValue = {
  loading: boolean;
  authed: boolean;
  clubId: string | null;
  clubName: string | null;
  role: ClubRole | null;
  memberships: Membership[];
  refresh: () => Promise<void>;
  logout: () => void;
};

const ClubContext = createContext<ClubContextValue | null>(null);

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const refresh = useCallback(async () => {
    if (!hasToken()) {
      setAuthed(false);
      setMemberships([]);
      setLoading(false);
      return;
    }
    setAuthed(true);
    try {
      const res = await api.get<{ memberships: Membership[] }>(
        "/clubs/me/memberships",
      );
      setMemberships(res.memberships);
    } catch (err) {
      setMemberships([]);
      // An expired session and "this account genuinely has no clubs" used to
      // look identical here, so a logged-out user got a broken-looking empty
      // dashboard instead of the login screen. The client clears the token on
      // a 401, so all that's left is to reflect that in the auth state.
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
    router.push("/login");
  }, [router]);

  const primary = memberships[0] ?? null;

  return (
    <ClubContext.Provider
      value={{
        loading,
        authed,
        clubId: primary?.clubId ?? null,
        clubName: primary?.clubName ?? null,
        role: primary?.role ?? null,
        memberships,
        refresh,
        logout,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used within a ClubProvider");
  return ctx;
}
