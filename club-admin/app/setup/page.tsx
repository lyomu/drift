"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  api,
  ApiError,
  hasToken,
  setToken,
} from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PasswordField,
  Select,
  Textarea,
} from "@/components/ui";
import { CourtGroupsEditor } from "@/components/CourtGroupsEditor";
import type { CourtGroup, ClubRole, MatchSport, Membership } from "@/lib/types";

type Step = "login" | "profile" | "courts" | "team" | "loading" | "signin";

const STEPS: { key: Step; label: string }[] = [
  { key: "login", label: "Account" },
  { key: "profile", label: "Club profile" },
  { key: "courts", label: "Courts" },
  { key: "team", label: "Team" },
];

const ROLES: ClubRole[] = [
  "ADMIN",
  "COMPETITION_MANAGER",
  "COACH",
  "CONTENT_MANAGER",
  "READ_ONLY",
];

function Stepper({ current }: { current: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mb-6 flex flex-wrap gap-x-6 gap-y-2">
      {STEPS.map((s, i) => {
        const state =
          i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
        return (
          <li key={s.key} className="flex items-center gap-2 text-[13px]">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                state === "active"
                  ? "bg-drift-primary text-white"
                  : state === "done"
                    ? "bg-drift-primary-light text-drift-primary-dark"
                    : "bg-drift-neutral-surface text-drift-text-secondary"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={
                state === "todo"
                  ? "text-drift-text-secondary"
                  : "font-semibold text-drift-text-primary"
              }
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Shell({
  title,
  step,
  error,
  onFinishLater,
  children,
}: {
  title: string;
  step: Step;
  error: string | null;
  onFinishLater: () => void;
  children: React.ReactNode;
}) {
  const showStepper = step !== "loading" && step !== "signin";
  const showFinishLater =
    step !== "loading" && step !== "signin" && step !== "login";
  return (
    <div className="flex min-h-screen items-start justify-center bg-drift-background px-4 py-12">
      <Card className="w-full max-w-xl">
        <h1 className="font-display text-2xl font-bold text-drift-text-primary">
          {title}
        </h1>
        <p className="mb-6 mt-1 text-sm text-drift-text-secondary">
          A few steps and you&apos;re live. You can change everything later from
          the dashboard.
        </p>
        {showStepper && <Stepper current={step} />}
        <ErrorBanner message={error} />
        {children}
        {showFinishLater && (
          <button
            type="button"
            onClick={onFinishLater}
            className="mt-6 text-[13px] font-semibold text-drift-text-secondary hover:text-drift-text-primary"
          >
            Finish later — go to the dashboard
          </button>
        )}
      </Card>
    </div>
  );
}

function SetupWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const { refresh } = useClub();

  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);

  // request prefill (token path only)
  const [request, setRequest] = useState<{
    clubName: string;
    location: string;
    requesterEmail: string;
  } | null>(null);

  // step 1
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // step 2
  const [profile, setProfile] = useState({
    description: "",
    address: "",
    phone: "",
    website: "",
  });
  const [sports, setSports] = useState<MatchSport[]>(["TENNIS"]);

  // step 3
  const [courtName, setCourtName] = useState("");
  const [courtAddress, setCourtAddress] = useState("");
  const [groups, setGroups] = useState<CourtGroup[]>([
    { surface: "HARD", indoor: false, lighting: false, count: 1 },
  ]);
  const [addedCourts, setAddedCourts] = useState<string[]>([]);

  // step 4
  const [invites, setInvites] = useState<{ email: string; role: ClubRole }[]>([
    { email: "", role: "ADMIN" },
  ]);

  const finishLater = useCallback(async () => {
    if (!clubId) {
      router.push("/");
      return;
    }
    try {
      await api.post(`/clubs/${clubId}/complete-setup`);
    } catch {
      /* non-fatal — everything is editable from the dashboard */
    }
    await refresh();
    router.push("/");
  }, [clubId, refresh, router]);

  // Resolve where to start.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (hasToken()) {
        try {
          const res = await api.get<{ memberships: Membership[] }>(
            "/clubs/me/memberships",
          );
          const pending = res.memberships.find((m) => !m.setupComplete);
          if (cancelled) return;
          if (!pending) {
            router.replace("/");
            return;
          }
          setClubId(pending.clubId);
          setStep("profile");
          return;
        } catch {
          setToken(null);
        }
      }
      if (!token) {
        router.replace("/request-club");
        return;
      }
      try {
        const res = await api.get<{
          clubName: string;
          location: string;
          requesterName: string;
          requesterEmail: string;
          accountExists: boolean;
        }>(`/club-creation-requests/${token}`);
        if (cancelled) return;
        setRequest({
          clubName: res.clubName,
          location: res.location,
          requesterEmail: res.requesterEmail,
        });
        setProfile((p) => ({ ...p, address: res.location }));
        setStep(res.accountExists ? "signin" : "login");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "This setup link is invalid or has expired.",
        );
        setStep("login");
        setRequest(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !request) return;
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const done = await api.post<{ email: string; clubId: string }>(
        `/club-creation-requests/${token}/complete`,
        { password },
      );
      const auth = await api.post<{ accessToken: string }>("/auth/login", {
        email: done.email,
        password,
      });
      setToken(auth.accessToken);
      setClubId(done.clubId);
      await refresh();
      setStep("profile");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Your account could not be set up.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/clubs/${clubId}`, {
        description: profile.description || undefined,
        address: profile.address || undefined,
        phone: profile.phone || undefined,
        website: profile.website || undefined,
        sports,
      });
      setStep("courts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function addCourt() {
    if (!clubId || !courtName.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/clubs/${clubId}/courts`, {
        name: courtName.trim(),
        address: courtAddress.trim() || undefined,
        courtGroups: groups,
      });
      setAddedCourts((c) => [...c, courtName.trim()]);
      setCourtName("");
      setCourtAddress("");
      setGroups([{ surface: "HARD", indoor: false, lighting: false, count: 1 }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The court could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvitesAndFinish() {
    if (!clubId) return;
    setError(null);
    setBusy(true);
    try {
      for (const row of invites) {
        const email = row.email.trim();
        if (!email) continue;
        try {
          await api.post(`/clubs/${clubId}/members`, { email, role: row.role });
        } catch (err) {
          setError(
            `${email}: ${err instanceof ApiError ? err.message : "could not be invited"}. Fix or clear this row, then Finish.`,
          );
          setBusy(false);
          return;
        }
      }
      await api.post(`/clubs/${clubId}/complete-setup`);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Setup could not be finished.");
      setBusy(false);
    }
  }

  const shellTitle = request?.clubName
    ? `Set up ${request.clubName}`
    : "Set up your club";

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">
        Loading…
      </div>
    );
  }

  if (step === "signin") {
    return (
      <Shell
        title={shellTitle}
        step={step}
        error={error}
        onFinishLater={() => void finishLater()}
      >
        <p className="text-sm leading-6 text-drift-text-secondary">
          You already have a Drift account for{" "}
          <span className="font-semibold text-drift-text-primary">
            {request?.requesterEmail}
          </span>
          . Sign in with it first, then open this setup link again.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-md bg-drift-primary px-[18px] py-2.5 text-[13.5px] font-bold text-white"
        >
          Go to sign in
        </Link>
      </Shell>
    );
  }

  if (step === "login") {
    return (
      <Shell
        title={shellTitle}
        step={step}
        error={error}
        onFinishLater={() => void finishLater()}
      >
        <form onSubmit={submitLogin} className="flex flex-col gap-4">
          <Field label="Email">
            <Input value={request?.requesterEmail ?? ""} readOnly disabled />
          </Field>
          <PasswordField
            label="Create a password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={busy || !request} className="mt-2 w-full">
            {busy ? "Creating your account…" : "Create account & continue"}
          </Button>
        </form>
      </Shell>
    );
  }

  if (step === "profile") {
    return (
      <Shell
        title={shellTitle}
        step={step}
        error={error}
        onFinishLater={() => void finishLater()}
      >
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <Field label="Description">
            <Textarea
              rows={3}
              value={profile.description}
              onChange={(e) =>
                setProfile({ ...profile, description: e.target.value })
              }
            />
          </Field>
          <Field label="Address / Location">
            <Input
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </Field>
            <Field label="Website">
              <Input
                value={profile.website}
                onChange={(e) =>
                  setProfile({ ...profile, website: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Sports">
            <div className="flex gap-4">
              {(["TENNIS", "PADEL"] as MatchSport[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 text-sm text-drift-text-primary"
                >
                  <input
                    type="checkbox"
                    checked={sports.includes(s)}
                    onChange={(e) =>
                      setSports((cur) =>
                        e.target.checked
                          ? [...cur, s]
                          : cur.filter((x) => x !== s),
                      )
                    }
                  />
                  {s[0] + s.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </Field>
          <Button type="submit" disabled={busy} className="mt-2 self-start">
            {busy ? "Saving…" : "Save & continue"}
          </Button>
        </form>
      </Shell>
    );
  }

  if (step === "courts") {
    return (
      <Shell
        title={shellTitle}
        step={step}
        error={error}
        onFinishLater={() => void finishLater()}
      >
        <p className="mb-4 text-[13px] leading-6 text-drift-text-secondary">
          Optional. Add courts only if your club runs its own — plenty of clubs
          on Drift don&apos;t, and their members find courts themselves. You can
          always add courts later from the dashboard.
        </p>
        {addedCourts.length > 0 && (
          <p className="mb-4 text-[13px] text-drift-text-secondary">
            Added: {addedCourts.join(", ")}
          </p>
        )}
        <div className="flex flex-col gap-4">
          <Field label="Court name">
            <Input
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="e.g. Main courts"
            />
          </Field>
          <Field label="Address (optional)">
            <Input
              value={courtAddress}
              onChange={(e) => setCourtAddress(e.target.value)}
            />
          </Field>
          <CourtGroupsEditor groups={groups} onChange={setGroups} />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !courtName.trim()}
              onClick={() => void addCourt()}
            >
              {busy ? "Adding…" : "Add this court"}
            </Button>
            <Button type="button" onClick={() => setStep("team")}>
              {addedCourts.length > 0 ? "Continue" : "Continue without courts"}
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // team
  return (
    <Shell
      title={shellTitle}
      step={step}
      error={error}
      onFinishLater={() => void finishLater()}
    >
      <div className="flex flex-col gap-3">
        {invites.map((row, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="teammate@example.com"
              value={row.email}
              onChange={(e) =>
                setInvites((cur) =>
                  cur.map((r, j) =>
                    j === i ? { ...r, email: e.target.value } : r,
                  ),
                )
              }
              className="flex-1"
            />
            <Select
              value={row.role}
              onChange={(e) =>
                setInvites((cur) =>
                  cur.map((r, j) =>
                    j === i ? { ...r, role: e.target.value as ClubRole } : r,
                  ),
                )
              }
              className="sm:w-52"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setInvites((cur) => [...cur, { email: "", role: "ADMIN" }])
          }
          className="self-start text-[13px] font-semibold text-drift-primary"
        >
          + Add another
        </button>
        <p className="text-[12.5px] text-drift-text-secondary">
          People you invite must already have a Drift account. You can also add
          them later from Members.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button disabled={busy} onClick={() => void sendInvitesAndFinish()}>
            {busy ? "Finishing…" : "Send invites & finish"}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void finishLater()}
          >
            Skip & finish
          </Button>
        </div>
      </div>
    </Shell>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">
          Loading…
        </div>
      }
    >
      <SetupWizard />
    </Suspense>
  );
}
