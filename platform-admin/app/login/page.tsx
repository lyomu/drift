"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button, ErrorBanner, Input, PasswordField } from "@/components/ui";
import { api, ApiError, setTwoFactorChallenge, type TwoFactorChallenge } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<TwoFactorChallenge & { requiresTwoFactor: true }>("/auth/login", {
        email,
        password,
      });
      setTwoFactorChallenge(res);
      router.push("/verify-2fa");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The admin API could not be reached. Check that the backend is running on port 3009.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-4 py-4 text-[#111827] sm:px-8 lg:px-10">
      <section className="flex w-full max-w-[1320px] overflow-hidden rounded-[24px] bg-white shadow-[0_22px_68px_rgba(17,24,39,0.12)] max-lg:max-w-[760px] max-lg:flex-col lg:h-[calc(100vh-48px)] lg:max-h-[760px] lg:min-h-[620px]">
        <aside className="relative min-h-[300px] flex-1 overflow-hidden bg-[#0F1725] p-7 text-white lg:min-h-0">
          <div className="flex items-center gap-2.5">
            <MaterialIcon name="sports_tennis" className="text-[24px]" />
            <span className="font-display text-[17px] font-extrabold">Drift</span>
          </div>

          <div className="absolute inset-x-7 top-1/2 hidden -translate-y-1/2 flex-col items-center justify-center text-center text-[#C7D2E5]/20 lg:flex">
            <MaterialIcon name="image" className="text-[34px]" />
            <p className="mt-2 text-[13px] font-semibold">Drop a photo of your team or venues</p>
            <span className="mt-0.5 text-[12px] underline decoration-white/10 underline-offset-4">
              or browse files
            </span>
          </div>

          <div className="absolute inset-x-7 bottom-7">
            <blockquote className="max-w-[520px] font-display text-[25px] font-extrabold leading-[1.36] lg:text-[28px]">
              &quot;One console for every club, court, and dispute on the platform.&quot;
            </blockquote>
            <div className="mt-5">
              <div className="text-[14px] font-extrabold">Priya Shah</div>
              <div className="mt-0.5 text-[13px] font-medium text-[#C7D2E5]">
                Super Admin, Drift Platform Team
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:min-h-0 lg:px-12">
          <div className="w-full max-w-[440px]">
            <div className="mb-7">
              <h1 className="font-display text-[28px] font-extrabold leading-tight text-[#111827] sm:text-[30px]">
                Welcome back
              </h1>
              <p className="mt-2 max-w-[400px] text-[15px] leading-6 text-[#6B7280]">
                Sign in with your staff account. Player and club accounts cannot sign in here.
              </p>
            </div>

            <ErrorBanner message={error} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[14px] font-bold text-[#6B7280]">Email</span>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@driftapp.com"
                  className="!h-[52px] !rounded-[10px] !border-[#E5E7EB] !px-4 !text-[14px] font-medium !text-[#111827] placeholder:!text-[#6B7280]"
                />
              </label>
              <PasswordField
                label="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                labelClassName="text-[14px] font-bold text-[#6B7280]"
                inputClassName="!h-[52px] !rounded-[10px] !border-[#E5E7EB] !px-4 !pr-12 !text-[14px] font-medium !text-[#111827] placeholder:!text-[#6B7280]"
              />

              <div className="-mt-1 flex items-center justify-between gap-4 text-[14px]">
                <label className="flex cursor-pointer items-center gap-2.5 text-[#6B7280]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#9CA3AF]"
                  />
                  Remember me
                </label>
                <Link href="/reset-password" className="font-bold text-[#1D4ED8] hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="mt-3 min-h-[54px] w-full rounded-[10px] bg-[#1D4ED8] text-[16px] hover:bg-[#1E3A8A]"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
              <p className="mt-1 text-center text-[14px] text-[#6B7280]">
                Have an invite link?{" "}
                <Link href="/accept-invite" className="font-bold text-[#1D4ED8] hover:underline">
                  Accept invite
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
