"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { hasToken } from "@/lib/api-client";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, clubId, clubName, role } = useClub();

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    if (!loading && !clubId) {
      router.replace("/setup");
    }
  }, [loading, clubId, router]);

  if (!hasToken() || loading || !clubId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-drift-background">
      <Sidebar clubName={clubName} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav clubName={clubName} />
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 md:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
