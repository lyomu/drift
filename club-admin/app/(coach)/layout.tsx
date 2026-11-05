"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/api-client";
import { useWorkspace } from "@/lib/workspace-context";
import { CoachSidebar } from "@/components/CoachSidebar";
import { CoachHeader } from "@/components/CoachHeader";
import { useT } from "@/lib/i18n/i18n-context";

/**
 * The coach workspace shell. Deliberately a sibling of `(dashboard)` rather
 * than a page inside it: the two share a login and a token, but nothing else.
 *
 * A signed-in account with no coach context is not turned away -- opening the
 * application form is how a coach context comes into existence in the first
 * place, so the shell renders and `/coach` handles the empty case.
 */
export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const { loading, authed } = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!hasToken()) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!loading && !authed) router.replace("/login");
  }, [loading, authed, router]);

  if (!hasToken() || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">{t("a.loading")}</div>
    );
  }

  return (
    <div className="flex min-h-screen bg-drift-background">
      <CoachSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <CoachHeader onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto box-border flex w-full max-w-[1470px] flex-1 flex-col px-4 pb-6 pt-6 sm:px-[34px] sm:pb-14 sm:pt-[38px]">
          {children}
        </main>
      </div>
    </div>
  );
}
