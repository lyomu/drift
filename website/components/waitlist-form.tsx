"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import type { Dictionary } from "@/lib/content";
import { countryOptions } from "@/lib/countries";

import styles from "./waitlist-form.module.css";

type Status = "idle" | "submitting" | "success" | "error";

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function WaitlistForm({ t }: { t: Dictionary["waitlist"] }) {
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
      setError(t.form.errorFirstName);
      setStatus("error");
      return;
    }
    if (!looksLikeEmail(email)) {
      setError(t.form.errorEmail);
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
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? t.form.errorGeneric);
      }
      setStatus("success");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : t.form.errorGeneric);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.success}>
        <span>{t.form.badge}</span>
        <p ref={successRef} tabIndex={-1} className={styles.successTitle}>
          {firstName.trim() ? t.success.personalTitle.replace("{name}", firstName.trim()) : t.success.title}
        </p>
        <p className={styles.successBody}>{t.success.body}</p>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <div className={styles.formHeader}>
        <strong>Get early access</strong>
        <span>Tennis first. Padel follows. Free to join.</span>
      </div>

      <div className={styles.field}>
        <label htmlFor={firstNameId}>{t.form.firstName}</label>
        <input id={firstNameId} className={styles.control} type="text" name="firstName" autoComplete="given-name" required value={firstName} disabled={submitting} onChange={(event) => setFirstName(event.target.value)} placeholder={t.form.firstNamePlaceholder} />
      </div>

      <div className={styles.field}>
        <label htmlFor={emailId}>{t.form.email}</label>
        <input id={emailId} className={styles.control} type="email" name="email" inputMode="email" autoComplete="email" required value={email} disabled={submitting} aria-invalid={status === "error" ? true : undefined} aria-describedby={status === "error" ? errorId : undefined} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
      </div>

      <fieldset className={styles.roleField}>
        <legend>{t.form.legend}</legend>
        <div className={styles.roleOptions}>
          {t.audiences.map((option) => (
            <label key={option.value} className={styles.roleOption}>
              <input type="radio" name="audience" value={option.value} checked={audience === option.value} disabled={submitting} onChange={(event) => setAudience(event.target.value)} />
              <span className={styles.roleTitle}>{option.label}</span>
              <span className={styles.roleHint}>{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={countryId}>{t.form.country} <span>{t.form.optional}</span></label>
        <select id={countryId} className={`${styles.control} ${styles.select}`} name="country" value={country} disabled={submitting} onChange={(event) => setCountry(event.target.value)}>
          {countryOptions.map((option, index) => <option key={option.value} value={option.value}>{index === 0 ? t.form.selectCountry : option.label}</option>)}
        </select>
      </div>

      <div className={styles.cityLevel}>
        <div className={styles.field}>
          <label htmlFor={cityId}>{t.form.city} <span>{t.form.optional}</span></label>
          <input id={cityId} className={styles.control} type="text" name="city" autoComplete="address-level2" value={city} disabled={submitting} onChange={(event) => setCity(event.target.value)} placeholder={t.form.cityPlaceholder} />
        </div>
        <div className={styles.field}>
          <label htmlFor={levelId}>{t.form.level} <span>{t.form.optional}</span></label>
          <select id={levelId} className={`${styles.control} ${styles.select}`} name="level" value={level} disabled={submitting} onChange={(event) => setLevel(event.target.value)}>
            {t.levels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <p id={errorId} role="status" aria-live="polite" className={styles.error}>{status === "error" ? error : null}</p>
      <button type="submit" className={styles.submit} disabled={submitting}>{submitting ? t.form.submitting : <>{t.form.submit} <span aria-hidden="true">→</span></>}</button>
      <p className={styles.privacy}>{t.note} <Link href="/privacy-policy">{t.form.privacyLink}</Link></p>
    </form>
  );
}
