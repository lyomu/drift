"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { IconChip } from "@/components/dashboard-design";
import { Button, ErrorBanner, Field, Input, PasswordField } from "@/components/ui";
import { api, ApiError, setToken } from "@/lib/api-client";
import { useT } from "@/lib/i18n/i18n-context";

type ForgotPasswordResponse = {
  devVerificationCode?: string;
};

function ResetPasswordForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset" | "done">(
    searchParams.get("code") ? "reset" : "request",
  );
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDevCode(null);
    try {
      const response = await api.post<ForgotPasswordResponse>("/auth/forgot-password", {
        email,
      });
      setDevCode(response?.devVerificationCode ?? null);
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.resetSendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post<void>("/auth/reset-password", {
        email,
        code,
        newPassword,
      });
      setToken(null);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.resetFailed"));
    } finally {
      setBusy(false);
    }
  }

  const complete = step === "done";

  return (
    <div className="flex min-h-screen items-center justify-center bg-drift-background px-4 py-10">
      <div className="w-full max-w-[380px] rounded-lg bg-drift-surface p-8 shadow-[0_24px_60px_rgba(17,24,39,0.12)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <IconChip
            icon={complete ? "check_circle" : step === "reset" ? "password" : "lock_reset"}
            tone={complete ? "success" : "info"}
            round
          />
          <h1 className="mt-4 text-[24px] font-extrabold text-drift-text-primary">
            {complete
              ? t("auth.passwordUpdated")
              : step === "reset"
                ? t("auth.enterResetCode")
                : t("auth.resetYourPassword")}
          </h1>
          <p className="mt-2 text-[13.5px] leading-6 text-drift-text-secondary">
            {complete
              ? t("auth.canNowLogIn")
              : step === "reset"
                ? t("auth.useSixDigit")
                : t("auth.enterEmailForCode")}
          </p>
        </div>

        <ErrorBanner message={error} />
        {devCode && (
          <div className="mb-4 rounded-md border border-drift-warning/25 bg-drift-warning-surface px-3 py-2 text-center text-sm font-bold text-drift-warning">
            Dev reset code: {devCode}
          </div>
        )}

        {step === "request" && (
          <form onSubmit={requestReset} className="flex flex-col gap-4">
            <Field label={t("auth.email")}>
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@club.com"
              />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("auth.sending") : t("auth.sendResetCode")}
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            <Field label={t("auth.email")}>
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@club.com"
              />
            </Field>
            <Field label={t("auth.resetCode")}>
              <Input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </Field>
            <PasswordField
              label={t("auth.newPassword")}
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <PasswordField
              label={t("auth.confirmPassword")}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("auth.updating") : t("auth.updatePassword")}
            </Button>
            <button
              type="button"
              onClick={() => setStep("request")}
              className="text-[12.5px] font-bold text-drift-primary"
            >
              {t("auth.requestAnotherCode")}
            </button>
          </form>
        )}

        {complete && (
          <Link href="/login">
            <Button className="w-full">{t("auth.backToLogin")}</Button>
          </Link>
        )}

        {!complete && (
          <Link href="/login" className="mt-6 block text-center text-sm font-bold text-drift-primary">
            {t("auth.backToLogin")}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-drift-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
