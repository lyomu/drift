"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-drift-background px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
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
          <Field label="Password (at least 12 characters)">
            <Input type="password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password">
            <Input type="password" minLength={12} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button type="submit" disabled={busy || !token}>
            {busy ? "Creating account…" : "Create staff account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return <Suspense><AcceptInviteForm /></Suspense>;
}
