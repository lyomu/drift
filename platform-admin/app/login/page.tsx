"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ErrorBanner, Input, PasswordField } from "@/components/ui";
import type { CurrentPlatformAdmin, PlatformPermission } from "@/lib/access-types";
import {
  api,
  ApiError,
  setToken,
  setTwoFactorChallenge,
  type TwoFactorChallenge,
} from "@/lib/api-client";

const LANDINGS: { permission: PlatformPermission; href: string }[] = [
  { permission: "ANALYTICS_READ", href: "/" },
  { permission: "VENUES_MANAGE", href: "/venues" },
  { permission: "ORGANIZATIONS_MANAGE", href: "/organizations" },
  { permission: "ACCESS_MANAGE", href: "/access/team" },
  { permission: "CONTENT_MANAGE", href: "/content" },
  { permission: "COMMERCIAL_MANAGE", href: "/commercial/plans" },
  { permission: "TRUST_SAFETY_MANAGE", href: "/reports" },
  { permission: "PLATFORM_CONFIG_MANAGE", href: "/settings" },
  { permission: "SUPPORT_MANAGE", href: "/support/tickets" },
  { permission: "USERS_MANAGE", href: "/users" },
  { permission: "COMPETITIONS_MANAGE", href: "/competitions" },
  { permission: "AUDIT_READ", href: "/audit-logs" },
];

// Real photos, not stock-placeholder gray boxes — courts and matches, since
// this panel is what staff see every time they sign in. Sourced from
// Unsplash (free tier, no attribution required under the Unsplash License).
const SLIDER_IMAGES = [
  "https://images.unsplash.com/photo-1620742820748-87c09249a72a?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1499510318569-1a3d67dc3976?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1635873021329-c0af04695c9d?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1689942963385-f5bd03f3b270?auto=format&fit=crop&w=1200&q=70",
];

type PlatformLoginResponse =
  | (TwoFactorChallenge & { requiresTwoFactor: true })
  | { requiresTwoFactor: false; accessToken: string };

function landingFor(admin: CurrentPlatformAdmin) {
  return admin.role.permissions.includes("ANALYTICS_READ")
    ? "/"
    : (LANDINGS.find((item) => admin.role.permissions.includes(item.permission))?.href ?? "/");
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((i) => (i + 1) % SLIDER_IMAGES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<PlatformLoginResponse>("/auth/login", {
        email,
        password,
      });
      if (!res.requiresTwoFactor) {
        setToken(res.accessToken);
        setTwoFactorChallenge(null);
        const admin = await api.get<CurrentPlatformAdmin>("/auth/me");
        router.replace(landingFor(admin));
        return;
      }
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
    <main className="theme-light flex min-h-screen items-center justify-center bg-[#F7FAFC] px-4 py-4 text-[#111827] sm:px-8 lg:px-10">
      <section className="flex w-full max-w-[1320px] overflow-hidden rounded-[24px] bg-white shadow-[0_22px_68px_rgba(17,24,39,0.12)] max-lg:max-w-[760px] max-lg:flex-col lg:h-[calc(100vh-48px)] lg:max-h-[760px] lg:min-h-[620px]">
        <aside className="relative min-h-[300px] flex-1 overflow-hidden bg-[#0F1725] p-7 text-white lg:min-h-0">
          {/* Auto-rotating court/match photos, crossfaded. The gradient
              overlay is what keeps the logo and quote readable regardless
              of which photo is showing — without it, a bright sky-colored
              frame washes out the white text. */}
          <div className="absolute inset-0" aria-hidden="true">
            {SLIDER_IMAGES.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- external
              // Unsplash URLs; a decorative rotating background isn't worth
              // adding images.unsplash.com to next.config's remotePatterns for.
              <img
                key={src}
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
                style={{ opacity: i === activeSlide ? 1 : 0 }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1725] via-[#0F1725]/70 to-[#0F1725]/35" />
          </div>

          {/* The crest's black shield-half disappears against this panel's
              near-black background — half the logo was invisible before this
              white badge. Badge keeps it legible regardless of which photo
              is behind it, not just the flat navy. */}
          <div className="relative flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              <Image src="/images/drift-icon.png" alt="Drift" width={192} height={178} className="h-full w-full object-contain" />
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
                  className="!h-[52px] !rounded-[10px] !border-[#E5E7EB] !bg-white !px-4 !text-[14px] font-medium !text-[#111827] placeholder:!text-[#6B7280]"
                />
              </label>
              <PasswordField
                label="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                labelClassName="text-[14px] font-bold text-[#6B7280]"
                inputClassName="!h-[52px] !rounded-[10px] !border-[#E5E7EB] !bg-white !px-4 !pr-12 !text-[14px] font-medium !text-[#111827] placeholder:!text-[#6B7280]"
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
