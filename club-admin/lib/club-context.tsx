"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, hasToken, setToken } from "./api-client";
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
    } catch {
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
