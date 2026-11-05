"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { useWorkspace } from "@/lib/workspace-context";
import { hasToken } from "@/lib/api-client";
import { Sidebar } from "@/components/Sidebar";
import { SiteHeader } from "@/components/SiteHeader";
import { AttentionProvider } from "@/lib/use-attention";
import { useT } from "@/lib/i18n/i18n-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const { loading, clubId, clubName, role, setupComplete } = useClub();
  const { coach } = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    if (loading) return;
    if (!clubId) {
      // The role fork. Club staff and coaches share this origin and this
      // login, so "/" is whichever workspace the account actually holds --
      // and only an account with neither is asked to register a club.
      router.replace(coach ? "/coach" : "/request-club");
    } else if (!setupComplete) {
      router.replace("/setup");
    }
  }, [loading, clubId, coach, setupComplete, router]);

  if (!hasToken() || loading || !clubId || !setupComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">{t("a.loading")}</div>
    );
  }

  return (
    <AttentionProvider>
    <div className="flex min-h-screen bg-drift-background">
      <Sidebar
        clubName={clubName}
        role={role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <SiteHeader onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto box-border flex w-full max-w-[1470px] flex-1 flex-col px-4 pb-6 pt-6 sm:px-[34px] sm:pb-14 sm:pt-[38px]">
          {children}
        </main>
      </div>
    </div>
    </AttentionProvider>
  );
}
