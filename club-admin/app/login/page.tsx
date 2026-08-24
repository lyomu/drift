"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, setToken } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-drift-background px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-display text-2xl font-bold text-drift-text-primary">
            Drift Club Admin
          </div>
          <p className="mt-1 text-sm text-drift-text-secondary">
            Sign in with your Drift account
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
          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-drift-text-secondary">
          New to Drift Club Admin?{" "}
          <Link href="/signup" className="font-semibold text-drift-primary">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
