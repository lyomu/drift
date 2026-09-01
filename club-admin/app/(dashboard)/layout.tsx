"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { hasToken } from "@/lib/api-client";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { SiteHeader } from "@/components/SiteHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, clubId, clubName, role, setupComplete } = useClub();

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    if (loading) return;
    if (!clubId) {
      router.replace("/request-club");
    } else if (!setupComplete) {
      router.replace("/setup");
    }
  }, [loading, clubId, setupComplete, router]);

  if (!hasToken() || loading || !clubId || !setupComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-drift-background">
      <Sidebar clubName={clubName} role={role} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <MobileNav clubName={clubName} />
        <SiteHeader />
        <main className="box-border flex w-full flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8 sm:pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}
