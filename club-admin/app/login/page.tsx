"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button, ErrorBanner, Input, PasswordField } from "@/components/ui";
import { api, ApiError, setToken } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useClub();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await api.post<{ accessToken: string }>("/auth/login", {
        email,
        password,
      });
      setToken(tokens.accessToken);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden border-t-[5px] border-[#1F1B16] bg-[#FBF7EE] text-[#111827]">
      <header className="relative z-10 flex items-start justify-between gap-6 px-6 py-6 sm:px-10 lg:px-[58px]">
        <Link href="/login" className="group inline-flex flex-col gap-2.5">
          <span className="font-display text-[24px] font-extrabold leading-none text-[#111827]">
            Drift
          </span>
          <span className="h-[2px] w-[72px] bg-[#111827] transition group-hover:w-full" />
        </Link>
        <p className="hidden text-[14px] text-[#6B7280] sm:block">
          Need help?{" "}
          <a href="mailto:support@drift.app" className="font-extrabold text-[#111827] hover:underline">
            support@drift.app
          </a>
        </p>
      </header>

      <div
        aria-hidden="true"
        className="absolute left-[6%] top-[32%] hidden h-[116px] w-[90px] rounded-md bg-[#E8F5FC] lg:block"
        style={{
          backgroundImage: "radial-gradient(#111827 1.6px, transparent 1.6px)",
          backgroundPosition: "8px 8px",
          backgroundSize: "15px 15px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute right-[7%] top-[21%] hidden h-[124px] w-[100px] rounded-md bg-[#E8F5FC] lg:block"
        style={{
          backgroundImage: "radial-gradient(#111827 1.6px, transparent 1.6px)",
          backgroundPosition: "8px 8px",
          backgroundSize: "15px 15px",
        }}
      />
      <div aria-hidden="true" className="absolute left-[15%] top-[58%] hidden h-[74px] w-[74px] rounded-md border-[2.5px] border-[#111827] lg:block" />
      <div aria-hidden="true" className="absolute right-[16%] top-[47%] hidden h-[70px] w-[70px] rounded-md border-[2.5px] border-[#111827] lg:block" />
      <div aria-hidden="true" className="absolute left-[12%] top-[22%] hidden h-3.5 w-3.5 rounded-full border-[2.5px] border-[#111827] lg:block" />
      <div aria-hidden="true" className="absolute right-[22%] top-[68%] hidden h-4 w-4 rounded-full border-[2.5px] border-[#111827] lg:block" />
      <MaterialIcon
        name="keyboard_arrow_up"
        className="absolute left-[20%] top-[69%] hidden text-[42px] text-[#111827] lg:block"
      />

      <section className="relative z-10 flex flex-1 items-center justify-center px-5 py-4">
        <div className="w-full max-w-[400px] rounded-[24px] bg-white px-8 py-9 shadow-[0_28px_64px_rgba(17,24,39,0.14)]">
          <div className="text-center">
            <h1 className="font-display text-[26px] font-extrabold leading-tight text-[#111827]">
              Club Admin Login
            </h1>
            <p className="mx-auto mt-2.5 max-w-[280px] text-[14px] leading-6 text-[#6B7280]">
              Enter your details to get signed in to your club dashboard
            </p>
          </div>

          <div className="mt-6">
            <ErrorBanner message={error} />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
            <label className="relative block">
              <span className="sr-only">Email address</span>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Enter email address"
                className="!h-[52px] !rounded-[10px] !border-[1.5px] !border-[#E5E7EB] !px-4 !pr-12 !text-[14px] !text-[#111827] placeholder:!text-[#6B7280]"
              />
              <span className="absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[#9CA3AF]" />
            </label>
            <PasswordField
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Password"
              labelClassName="sr-only"
              inputClassName="!h-[52px] !rounded-[10px] !border-[1.5px] !border-[#E5E7EB] !px-4 !pr-16 !text-[14px] !text-[#111827] placeholder:!text-[#6B7280]"
              toggleVariant="text"
              toggleClassName="!right-3.5 !text-[12.5px] !text-[#6B7280] hover:!text-[#111827]"
            />

            <Link
              href="/reset-password"
              className="self-start text-[13px] font-extrabold text-[#111827] hover:underline"
            >
              Having trouble signing in?
            </Link>

            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 min-h-[54px] w-full rounded-[10px] bg-[#1C91D0] text-[16px] hover:bg-[#126A9B]"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-[#6B7280]">
            New to Drift?{" "}
            <Link href="/request-club" className="font-extrabold text-[#111827] hover:underline">
              Register a club
            </Link>
          </p>
        </div>
      </section>

      <footer className="relative z-10 pb-5 text-center text-[12px] font-medium text-[#9CA3AF]">
        &copy; Drift 2026 | Privacy Policy
      </footer>
    </main>
  );
}
