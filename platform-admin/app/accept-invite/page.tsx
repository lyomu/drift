"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialIcon } from "@/components/dashboard-design";
import { Button, Card, ErrorBanner, Field, Input, PasswordField } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/accept-invite", { token, name, password });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The invitation could not be accepted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-drift-background px-4 py-10">
      <Card className="w-full max-w-[420px] rounded-[20px] p-8 shadow-[0_12px_40px_rgba(17,24,39,0.08)]">
        <div className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-drift-primary-light text-drift-primary">
            <MaterialIcon name="how_to_reg" filled />
          </div>
          <h1 className="font-display text-2xl font-bold text-drift-text-primary">
            Join the platform team
          </h1>
          <p className="mt-2 text-sm leading-6 text-drift-text-secondary">
            Create your staff credentials. Your assigned role becomes active immediately.
          </p>
        </div>
        <ErrorBanner message={!token ? "This invitation link is incomplete." : error} />
        <form onSubmit={accept} className="flex flex-col gap-4">
          <Field label="Full name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <PasswordField
            label="Password"
            minLength={12}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            minLength={12}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" icon="person_add" disabled={busy || !token}>
            {busy ? "Creating account..." : "Create staff account"}
          </Button>
        </form>
        <Link href="/login" className="mt-5 inline-flex text-sm font-bold text-drift-primary hover:underline">
          Back to sign in
        </Link>
      </Card>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
