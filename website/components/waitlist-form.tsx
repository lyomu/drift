"use client";

/**
 * The waitlist form — the first client component and first form on this
 * surface, so it sets the pattern rather than following one.
 *
 * Deliberately plain: `useState` and `fetch`, no form library. The site
 * carries zero runtime dependencies beyond React and Next, and one form does
 * not justify breaking that.
 *
 * It posts same-origin to `/api/waitlist`, which proxies to the API
 * server-side. That is what keeps `connect-src 'self'` and `form-action
 * 'self'` intact in `next.config.ts` — the browser never talks to another
 * origin.
 *
 * Honesty rules apply here too (DESIGN.md rule 4): no signup count, no
 * "spots remaining", no countdown. It is clear about launch updates and
 * occasional internal Drift Tennis offers, with a link to the policy that
 * explains the promise in full.
 */
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { waitlist } from "@/lib/content";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Deliberately permissive: the server and the mail provider are the real
 * authorities on deliverability. This only catches the obvious typo before
 * a round trip.
 */
function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [audience, setAudience] = useState("PLAYER");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const firstNameId = useId();
  const emailId = useId();
  const countryId = useId();
  const cityId = useId();
  const levelId = useId();
  const errorId = useId();
  const successRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim()) {
      setError("Tell us your first name so we know what to call you.");
      setStatus("error");
      return;
    }

    if (!looksLikeEmail(email)) {
      setError("Enter an email address we can reach you at.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          audience,
          country: country || undefined,
          city: city.trim() || undefined,
          level: level || undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "That didn't go through.");
      }

      setStatus("success");
      // Success replaces the form, so focus has to be moved deliberately or
      // it falls back to the document and a screen-reader user hears nothing.
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : "That didn't go through.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="drift-card p-6 sm:p-8">
        <span className="badge badge-success">On the list</span>
        <p
          ref={successRef}
          tabIndex={-1}
          className="mt-4 text-2xl font-bold outline-none"
        >
          {firstName.trim()
            ? `You're on the list, ${firstName.trim()}.`
            : waitlist.success.title}
        </p>
        <p className="mt-2 leading-relaxed text-[var(--color-text-secondary)]">
          {waitlist.success.body}
        </p>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="drift-card p-6 sm:p-8">
      <div className="mb-5">
        <label className="field-label" htmlFor={firstNameId}>
          First name
        </label>
        <input
          id={firstNameId}
          className="input"
          type="text"
          name="firstName"
          autoComplete="given-name"
          required
          value={firstName}
          disabled={submitting}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="Sarah"
        />
      </div>

      <div>
        <label className="field-label" htmlFor={emailId}>
          Email address
        </label>
        <input
          id={emailId}
          className="input"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          disabled={submitting}
          aria-invalid={status === "error" ? true : undefined}
          aria-describedby={status === "error" ? errorId : undefined}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <fieldset className="mt-5">
        <legend className="field-label">I&apos;m…</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {waitlist.audiences.map((option) => (
            <label key={option.value} className="radio-card">
              <input
                type="radio"
                name="audience"
                value={option.value}
                checked={audience === option.value}
                disabled={submitting}
                onChange={(event) => setAudience(event.target.value)}
              />
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="field-hint">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="field-label" htmlFor={countryId}>
            Country <span className="font-normal">(optional)</span>
          </label>
          <select
            id={countryId}
            className="select"
            name="country"
            value={country}
            disabled={submitting}
            onChange={(event) => setCountry(event.target.value)}
          >
            {waitlist.countries.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor={cityId}>
            City <span className="font-normal">(optional)</span>
          </label>
          <input
            id={cityId}
            className="input"
            type="text"
            name="city"
            autoComplete="address-level2"
            value={city}
            disabled={submitting}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Your city"
          />
        </div>

        <div>
          <label className="field-label" htmlFor={levelId}>
            Level <span className="font-normal">(optional)</span>
          </label>
          <select
            id={levelId}
            className="select"
            name="level"
            value={level}
            disabled={submitting}
            onChange={(event) => setLevel(event.target.value)}
          >
            {waitlist.levels.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* The live region is always in the DOM — a region added at the moment
          it gains content is unreliably announced. */}
      <p
        id={errorId}
        role="status"
        aria-live="polite"
        className="mt-4 min-h-5 text-sm font-medium text-[var(--color-error)] empty:mt-0 empty:min-h-0"
      >
        {status === "error" && error ? error : null}
      </p>

      <button type="submit" className="btn-primary mt-4 w-full" disabled={submitting}>
        {submitting ? "Adding you…" : "Join the waitlist"}
      </button>

      <p className="field-hint mt-4">
        {waitlist.note}{" "}
        <Link
          className="font-semibold text-[var(--color-primary-dark)] underline"
          href="/privacy-policy"
        >
          Privacy Policy
        </Link>
      </p>
    </form>
  );
}
