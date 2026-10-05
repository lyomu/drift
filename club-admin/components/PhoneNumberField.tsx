"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

function flag(country: string) {
  return String.fromCodePoint(
    ...[...country.toUpperCase()].map(
      (letter) => 127397 + letter.charCodeAt(0),
    ),
  );
}

function initialCountry(value: string): CountryCode {
  const parsed = parsePhoneNumberFromString(value);
  if (parsed?.country) return parsed.country;
  try {
    if (typeof navigator === "undefined") return "KE";
    const region = new Intl.Locale(navigator.language).region?.toUpperCase();
    if (region && getCountries().includes(region as CountryCode))
      return region as CountryCode;
  } catch {
    /* Locale is a convenience, never a dependency. */
  }
  return "KE";
}

/** Searchable ISO country selector plus a local-number input. Value emitted is E.164. */
export function PhoneNumberField({
  value,
  onChange,
  label = "Phone",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [country, setCountry] = useState<CountryCode>(() =>
    initialCountry(value),
  );
  const [local, setLocal] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countryNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "region" }),
    [],
  );

  useEffect(() => {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) {
      setCountry(parsed.country);
      setLocal(parsed.nationalNumber);
    } else if (!value.startsWith("+")) {
      setLocal(value.replace(/\D/g, ""));
    }
  }, [value]);

  const countries = useMemo(
    () =>
      getCountries().filter((code) => {
        const haystack =
          `${countryNames.of(code) ?? code} ${code} +${getCountryCallingCode(code)}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      }),
    [countryNames, query],
  );

  function setNumber(next: string, nextCountry = country) {
    const digits = next.replace(/\D/g, "");
    setLocal(digits);
    onChange(digits ? `+${getCountryCallingCode(nextCountry)}${digits}` : "");
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-bold uppercase text-drift-text-secondary">
        {label}
      </label>
      <div className="flex overflow-hidden rounded-md border border-drift-border bg-white focus-within:ring-2 focus-within:ring-drift-primary/30">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-10 shrink-0 items-center gap-1 border-r border-drift-border px-3 text-sm font-semibold text-drift-text-primary"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span aria-hidden="true">{flag(country)}</span>
          <span>+{getCountryCallingCode(country)}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={local}
          onChange={(event) => setNumber(event.target.value)}
          placeholder="Phone number"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-drift-border bg-white shadow-xl">
          <div className="border-b border-drift-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries or codes"
              className="w-full rounded-md border border-drift-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-drift-primary/30"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {countries.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={code === country}
                  onClick={() => {
                    setCountry(code);
                    setNumber(local, code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-drift-background"
                >
                  <span className="text-base" aria-hidden="true">
                    {flag(code)}
                  </span>
                  <span className="flex-1 text-drift-text-primary">
                    {countryNames.of(code)}
                  </span>
                  <span className="text-drift-text-secondary">
                    +{getCountryCallingCode(code)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
