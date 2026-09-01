"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";
import type { CurrentPlatformAdmin, PlatformPermission } from "@/lib/access-types";
import {
  api,
  ApiError,
  getTwoFactorChallenge,
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

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = getTwoFactorChallenge();
    if (!stored) router.replace("/login");
    else setChallenge(stored);
  }, [router]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ accessToken: string }>("/auth/verify-2fa", {
        challengeToken: challenge.challengeToken,
        code,
      });
      setToken(result.accessToken);
      setTwoFactorChallenge(null);
      const admin = await api.get<CurrentPlatformAdmin>("/auth/me");
      const landing =
        admin.role.permissions.includes("ANALYTICS_READ")
          ? "/"
          : (LANDINGS.find((item) => admin.role.permissions.includes(item.permission))?.href ?? "/");
      router.replace(landing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.post<TwoFactorChallenge>("/auth/resend-2fa", {
        challengeToken: challenge.challengeToken,
      });
      setChallenge(next);
      setTwoFactorChallenge(next);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A new code could not be sent. Sign in again.");
    } finally {
      setBusy(false);
    }
  }

  if (!challenge) return null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-drift-background px-4 py-10">
      <Card className="w-full max-w-[420px] rounded-[20px] p-8 shadow-[0_12px_40px_rgba(17,24,39,0.08)]">
        <div className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-drift-primary-light text-drift-primary">
            <MaterialIcon name="password" filled />
          </div>
          <h1 className="font-display text-2xl font-bold text-drift-text-primary">
            Verify it is you
          </h1>
          <p className="mt-2 text-sm leading-6 text-drift-text-secondary">
            Enter the six-digit code sent to {challenge.maskedDestination}.
          </p>
        </div>
        <ErrorBanner message={error} />
        {challenge.devVerificationCode && (
          <div className="mb-4 rounded-xl border border-drift-primary/30 bg-drift-primary-light px-4 py-3 text-sm font-semibold text-drift-primary-dark">
            Development code: <span className="tabular">{challenge.devVerificationCode}</span>
          </div>
        )}
        <form onSubmit={verify} className="flex flex-col gap-4">
          <Field label="Verification code">
            <Input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl font-bold tracking-[0.25em]"
            />
          </Field>
          <Button type="submit" icon="verified_user" disabled={busy || code.length !== 6}>
            {busy ? "Verifying..." : "Verify code"}
          </Button>
          <Button type="button" variant="ghost" icon="refresh" disabled={busy} onClick={() => void resend()}>
            Resend code
          </Button>
        </form>
      </Card>
    </main>
  );
}
