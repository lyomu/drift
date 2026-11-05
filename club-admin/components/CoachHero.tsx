"use client";

import { InitialsAvatar } from "@/components/dashboard-design";
import { StatusBadge } from "@/components/StatusBadge";
import type { VerificationStatus } from "@/lib/types";

/**
 * The coach profile banner from the redesign: a brand-blue gradient with the
 * coach's initials, verification state and tags. Shared by the club console's
 * coach page and the coach workspace's own profile, so both read the same.
 *
 * Only data the app really holds is shown. The prototype's rating, sessions
 * and active-player counters have no source here, so they are not drawn.
 */
export function CoachHero({
  name,
  verification,
  subtitle,
  tags,
  aside,
}: {
  name: string;
  verification: VerificationStatus | null;
  subtitle?: string;
  tags?: string[];
  /** Optional right-hand panel, e.g. the public contact details. */
  aside?: React.ReactNode;
}) {
  return (
    <section className="relative mb-[18px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#0077cc] via-[#005a9e] to-[#003f73] p-6 text-white shadow-card sm:p-7">
      {/* Faint court lines, as in the prototype's banner. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/15" />
      <div aria-hidden="true" className="pointer-events-none absolute right-24 top-6 h-px w-72 rotate-[-28deg] bg-white/15" />

      <div className="relative flex flex-wrap items-end justify-between gap-6 pt-10 sm:pt-16">
        <div className="flex min-w-0 flex-wrap items-center gap-5">
          <InitialsAvatar
            name={name}
            tone="primary"
            size={84}
            className="border-4 border-white/30 shadow-[0_8px_24px_rgb(0_0_0/20%)]"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate font-display text-[clamp(22px,2.6vw,30px)] font-extrabold leading-tight">
                {name}
              </h1>
              {verification && <StatusBadge status={verification} />}
            </div>
            {subtitle && <p className="mt-1 truncate text-[13px] text-white/80">{subtitle}</p>}
            {tags && tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-bold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {aside && (
          <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-[12px]">{aside}</div>
        )}
      </div>
    </section>
  );
}
