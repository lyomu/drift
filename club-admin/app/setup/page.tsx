"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, hasToken } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input, Textarea } from "@/components/ui";

export default function SetupPage() {
  const router = useRouter();
  const { loading, clubId, refresh } = useClub();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasToken()) router.replace("/login");
    else if (!loading && clubId) router.replace("/");
  }, [loading, clubId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/clubs", {
        name,
        description: description || undefined,
        address: address || undefined,
      });
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
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-drift-text-primary">
            Set up your club
          </h1>
          <p className="mt-1 text-sm text-drift-text-secondary">
            You&apos;ll become the Owner of this club.
          </p>
        </div>
        <ErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Club name">
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Address">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Creating club…" : "Create club"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
