"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button, Card, ErrorBanner, Field, Input, PasswordField } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";

type ForgotResponse = {
  devVerificationCode?: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<ForgotResponse>("/auth/forgot-password", { email });
      setDevCode(response.devVerificationCode ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The reset request could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { email, code, newPassword });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The password could not be reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-drift-background px-4 py-10">
      <Card className="w-full max-w-[420px] rounded-[20px] p-8 shadow-[0_12px_40px_rgba(17,24,39,0.08)]">
        <div className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-drift-primary-light text-drift-primary">
            <MaterialIcon name="lock_reset" filled />
          </div>
          <h1 className="font-display text-2xl font-bold text-drift-text-primary">
            Reset staff password
          </h1>
          <p className="mt-2 text-sm leading-6 text-drift-text-secondary">
            Enter the staff email, then use the six-digit code to set a new password.
          </p>
        </div>
        <ErrorBanner message={error} />
        {devCode && (
          <div className="mb-4 rounded-xl border border-drift-primary/30 bg-drift-primary-light px-4 py-3 text-sm font-semibold text-drift-primary-dark">
            Development code: <span className="tabular">{devCode}</span>
          </div>
        )}

        {!sent ? (
          <form onSubmit={requestCode} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Button type="submit" icon="send" disabled={busy}>
              {busy ? "Sending..." : "Send reset code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
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
            <PasswordField
              label="New password"
              minLength={12}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm password"
              minLength={12}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button type="submit" icon="lock_open" disabled={busy || code.length !== 6}>
              {busy ? "Resetting..." : "Reset password"}
            </Button>
            <Button type="button" variant="ghost" icon="arrow_back" onClick={() => setSent(false)} disabled={busy}>
              Use another email
            </Button>
          </form>
        )}

        <Link href="/login" className="mt-5 inline-flex text-sm font-bold text-drift-primary hover:underline">
          Back to sign in
        </Link>
      </Card>
    </main>
  );
}
