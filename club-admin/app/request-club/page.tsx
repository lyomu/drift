"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { Button, Card, ErrorBanner, Field, Input, Textarea } from "@/components/ui";

export default function RequestClubPage() {
  const [form, setForm] = useState({
    clubName: "",
    location: "",
    requesterName: "",
    requesterEmail: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/club-creation-requests", {
        clubName: form.clubName.trim(),
        location: form.location.trim(),
        requesterName: form.requesterName.trim(),
        requesterEmail: form.requesterEmail.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The request could not be sent.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-drift-background px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <div className="font-display text-2xl font-bold text-drift-text-primary">
            Request a club on Drift
          </div>
          <p className="mt-1 text-sm text-drift-text-secondary">
            {done
              ? "Thanks — we've got your request."
              : "Tell us about your club. Our team reviews every request and emails you a setup link once it's approved."}
          </p>
        </div>

        {done ? (
          <>
            <p className="text-sm leading-6 text-drift-text-secondary">
              Watch <span className="font-semibold text-drift-text-primary">{form.requesterEmail}</span>{" "}
              for an approval email with your one-time setup link. It usually
              takes a day or two.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-semibold text-drift-primary"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <ErrorBanner message={error} />
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label="Club name">
                <Input
                  required
                  value={form.clubName}
                  onChange={(e) => setForm({ ...form, clubName: e.target.value })}
                />
              </Field>
              <Field label="Location">
                <Textarea
                  required
                  rows={2}
                  placeholder="City, area, or full address"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </Field>
              <Field label="Your name">
                <Input
                  required
                  value={form.requesterName}
                  onChange={(e) =>
                    setForm({ ...form, requesterName: e.target.value })
                  }
                  autoComplete="name"
                />
              </Field>
              <Field label="Your email">
                <Input
                  type="email"
                  required
                  value={form.requesterEmail}
                  onChange={(e) =>
                    setForm({ ...form, requesterEmail: e.target.value })
                  }
                  autoComplete="email"
                />
              </Field>
              <Button type="submit" disabled={submitting} className="mt-2 w-full">
                {submitting ? "Sending…" : "Submit request"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-drift-text-secondary">
              Already run a club here?{" "}
              <Link href="/login" className="font-semibold text-drift-primary">
                Sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
