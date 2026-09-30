"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/api-client";
import { useWorkspace } from "@/lib/workspace-context";
import { CoachSidebar } from "@/components/CoachSidebar";
import { CoachHeader } from "@/components/CoachHeader";

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
  const router = useRouter();
  const { loading, authed } = useWorkspace();

  useEffect(() => {
    if (!hasToken()) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!loading && !authed) router.replace("/login");
  }, [loading, authed, router]);

  if (!hasToken() || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-drift-background">
      <CoachSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <CoachHeader />
        <main className="box-border flex w-full flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8 sm:pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}
