"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ErrorBanner, Field, Input, PasswordField } from "@/components/ui";
import { api, ApiError, setToken } from "@/lib/api-client";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * Self-service signup, which club staff deliberately do not get: a club
 * arrives through request → approval → magic link, but a coach has no one to
 * vouch for them before they apply. The review step is what gates visibility,
 * not the signup.
 *
 * Two stages against the existing player auth routes — no second identity
 * system. `/auth/verify` returns tokens, so a verified coach lands straight in
 * the workspace.
 */
export default function CoachSignupPage() {
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [stage, setStage] = useState<"details" | "verify">("details");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedAgePolicy, setAcceptedAgePolicy] = useState(false);
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/signup", {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        acceptedAgePolicy,
      });
      setStage("verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await api.post<{ accessToken: string }>("/auth/verify", {
        email: email.trim(),
        code: code.trim(),
      });
      setToken(tokens.accessToken);
      await refresh();
      router.push("/coach/application");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await api.post("/auth/resend-code", { email: email.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="theme-light relative flex min-h-screen flex-col overflow-hidden border-t-[5px] border-[#1F1B16] bg-[#FBF7EE] text-[#111827]">
      <header className="relative z-10 flex items-start justify-between gap-6 px-6 py-6 sm:px-10 lg:px-[58px]">
        <Link href="/login" className="group inline-flex flex-col gap-2.5">
          <Image
            src="/images/drift-icon.png"
            alt="Drift"
            width={192}
            height={178}
            className="h-7 w-auto"
          />
          <span className="h-[2px] w-[72px] bg-[#111827] transition group-hover:w-full" />
        </Link>
        <p className="hidden text-[14px] text-[#6B7280] sm:block">
          Need help?{" "}
          <a
            href="mailto:support@drift.app"
            className="font-extrabold text-[#111827] hover:underline"
          >
            support@drift.app
          </a>
        </p>
      </header>

      <section className="relative z-10 flex flex-1 items-center justify-center px-5 py-4">
        <div className="w-full max-w-[440px] rounded-[24px] bg-white px-8 py-9 shadow-[0_28px_64px_rgba(17,24,39,0.14)]">
          <div className="text-center">
            <h1 className="font-display text-[26px] font-extrabold leading-tight text-[#111827]">
              {stage === "details" ? "Apply as a coach" : "Check your email"}
            </h1>
            <p className="mx-auto mt-2.5 max-w-[320px] text-[14px] leading-6 text-[#6B7280]">
              {stage === "details"
                ? "Create your Drift account, then tell us about your coaching. Every application is reviewed before your profile goes live."
                : `We sent a 6-digit code to ${email}.`}
            </p>
          </div>

          <div className="mt-6">
            <ErrorBanner message={error} />
          </div>

          {stage === "details" ? (
            <form onSubmit={createAccount} className="mt-2 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input
                    required
                    value={firstName}
                    autoComplete="given-name"
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    required
                    value={lastName}
                    autoComplete="family-name"
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Email address">
                <Input
                  type="email"
                  required
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <PasswordField
                label="Password"
                required
                value={password}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />

              {/* Launch policy P.2: Drift is 18+ until a guardian-consent flow
                  exists, and the server rejects a signup without this. */}
              <label className="flex items-start gap-2.5 text-[13px] leading-5 text-[#374151]">
                <input
                  type="checkbox"
                  required
                  checked={acceptedAgePolicy}
                  onChange={(event) =>
                    setAcceptedAgePolicy(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-[#1C91D0]"
                />
                <span>I confirm I am 18 or over.</span>
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="mt-2 min-h-[54px] w-full rounded-[10px] bg-[#1C91D0] text-[16px] hover:bg-[#126A9B]"
              >
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-2 flex flex-col gap-4">
              <Field label="Verification code">
                <Input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  autoComplete="one-time-code"
                  onChange={(event) => setCode(event.target.value)}
                />
              </Field>
              <Button
                type="submit"
                disabled={submitting}
                className="min-h-[54px] w-full rounded-[10px] bg-[#1C91D0] text-[16px] hover:bg-[#126A9B]"
              >
                {submitting ? "Verifying…" : "Verify and continue"}
              </Button>
              <button
                type="button"
                onClick={resend}
                className="self-center text-[13px] font-extrabold text-[#111827] hover:underline"
              >
                Resend code
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[13px] text-[#6B7280]">
            Already have a Drift account?{" "}
            <Link
              href="/login"
              className="font-extrabold text-[#111827] hover:underline"
            >
              Sign in
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
