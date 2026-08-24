"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, setToken } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useClub();
  const [step, setStep] = useState<"details" | "verify">("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/signup", { email, password });
      setStep("verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/verify", { email, code });
      const tokens = await api.post<{ accessToken: string }>("/auth/login", {
        email,
        password,
      });
      setToken(tokens.accessToken);
      await refresh();
      router.push("/setup");
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
            {step === "details"
              ? "Create your Drift account"
              : `Enter the code sent to ${email}`}
          </p>
        </div>
        <ErrorBanner message={error} />
        {step === "details" ? (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Creating account…" : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <Field label="Verification code">
              <Input
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Verifying…" : "Verify and continue"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-drift-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-drift-primary">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
