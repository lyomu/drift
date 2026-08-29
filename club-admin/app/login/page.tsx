"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, setToken } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-drift-background px-4 py-10">
      <div className="w-full max-w-[380px] rounded-[20px] bg-drift-surface p-8 shadow-[0_24px_60px_rgba(17,24,39,0.12)]">
        <div className="mb-6 text-center">
          <div className="font-display text-xl font-extrabold tracking-[-0.2px] text-drift-text-primary">
            Drift
          </div>
          <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.3px] text-drift-text-primary">
            Welcome back
          </h1>
          <p className="mt-1 text-[13.5px] text-drift-text-secondary">
            Sign in to manage your club
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
              placeholder="you@club.com"
            />
          </Field>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-drift-text-secondary">
                Password
              </span>
              <Link href="/reset-password" className="text-[12.5px] font-bold text-drift-primary">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-drift-text-secondary">
          New to Drift Club Admin?{" "}
          <Link href="/signup" className="font-bold text-drift-primary">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
