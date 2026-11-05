"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";

/** Work waiting on the signed-in person; each count is 0 for roles that cannot act on it. */
export type Attention = {
  pendingJoinRequests: number;
  openDisputes: number;
  pendingModeration: number;
  openCourtReports: number;
  pendingBookings: number;
  total: number;
};

const AttentionContext = createContext<Attention | null>(null);

/**
 * One call behind the bell dot and the sidebar badges (`GET /clubs/:id/attention`),
 * made once for the whole console rather than once per component. It re-reads
 * on navigation, so clearing a queue updates the badge straight away. A failure
 * just means no badges: it must never get in the way of the console.
 */
export function AttentionProvider({ children }: { children: React.ReactNode }) {
  const { clubId } = useClub();
  const pathname = usePathname();
  const [attention, setAttention] = useState<Attention | null>(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    api
      .get<Attention>(`/clubs/${clubId}/attention`)
      .then((res) => {
        if (!cancelled) setAttention(res);
      })
      .catch(() => {
        if (!cancelled) setAttention(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, pathname]);

  return <AttentionContext.Provider value={attention}>{children}</AttentionContext.Provider>;
}

export function useAttention(): Attention | null {
  return useContext(AttentionContext);
}
