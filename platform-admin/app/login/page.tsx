"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";
import { api, ApiError, setTwoFactorChallenge, type TwoFactorChallenge } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-drift-background px-4 py-10">
      <Card className="w-full max-w-[380px] rounded-[20px] p-8 shadow-[0_12px_40px_rgba(17,24,39,0.08)]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-drift-primary text-white">
            <MaterialIcon name="admin_panel_settings" filled />
          </div>
          <div className="font-display text-2xl font-bold text-drift-primary">Drift</div>
          <h1 className="mt-1 text-xl font-bold text-drift-text-primary">Platform Admin</h1>
          <p className="mt-2 text-sm leading-6 text-drift-text-secondary">
            Staff credentials only. Player accounts cannot sign in here.
          </p>
        </div>
        <ErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" icon="login" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm font-bold">
          <Link href="/reset-password" className="text-drift-primary hover:underline">
            Reset password
          </Link>
          <Link href="/accept-invite" className="text-drift-text-secondary hover:text-drift-primary">
            Accept invite
          </Link>
        </div>
      </Card>
    </main>
  );
}
