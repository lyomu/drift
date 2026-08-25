"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { hasToken, setToken } from "@/lib/api-client";
import { Button } from "@/components/ui";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/reports", label: "Reports" },
  { href: "/news/sources", label: "Sources" },
  { href: "/news/stories", label: "Stories" },
  { href: "/disputes", label: "Disputes" },
  { href: "/audit-logs", label: "Audit Log" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (typeof window !== "undefined" && !hasToken()) {
    router.replace("/login");
    return null;
  }

  if (!hasToken()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-drift-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-drift-border bg-drift-surface px-4 py-6 sm:flex">
        <div className="mb-8 px-2">
          <div className="font-display text-lg font-bold text-drift-text-primary">
            Drift
          </div>
          <div className="mt-1 text-sm font-semibold text-drift-text-secondary">
            Platform Admin
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-drift-primary-light text-drift-primary-dark"
                    : "text-drift-text-secondary hover:bg-drift-primary-light hover:text-drift-text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          className="mt-6 justify-start"
          onClick={() => {
            setToken(null);
            router.replace("/login");
          }}
        >
          Sign out
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header + nav strip */}
        <div className="border-b border-drift-border bg-drift-surface px-4 py-3 sm:hidden">
          <div className="font-display text-base font-bold text-drift-text-primary">
            Drift Platform Admin
          </div>
        </div>
        <nav className="flex overflow-x-auto border-b border-drift-border bg-drift-surface px-2 py-2 sm:hidden">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "bg-drift-primary-light text-drift-primary-dark"
                    : "text-drift-text-secondary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold text-drift-error"
            onClick={() => {
              setToken(null);
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
