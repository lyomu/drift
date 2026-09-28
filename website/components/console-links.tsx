/**
 * The way in to Club Admin for clubs and coaches.
 *
 * WHY THE LABEL IS NEVER DROPPED: players do not sign in on the web at all —
 * the player surface is the mobile app, and the only web CTA aimed at them is
 * the waitlist. A bare "Sign in" next to "Join the waitlist" would therefore
 * read as a second player path that does not exist. "Clubs & coaches" is what
 * makes the pair unambiguous, so it stays visible at every width rather than
 * being hidden on smaller screens to save room.
 *
 * Coaches share the club destination on purpose. There is no coach console and
 * no coach signup today (`club-admin/app/signup` only redirects to the club
 * request form), so both audiences land on the same honest entry point.
 *
 * Two variants, one source of truth for the destinations and the copy:
 *   `bar`  — the desktop header row, shown from `lg` up.
 *   `rail` — `<li>` items for the horizontally scrollable chip row that
 *            replaces the nav below `lg`. Returns a fragment so it slots
 *            straight into the existing `<ul>`.
 */
import { getDictionary } from "@/lib/content";
import type { Locale } from "@/lib/locales";
import { CLUB_SIGN_IN_URL, CLUB_SIGN_UP_URL } from "@/lib/site";

export function ConsoleLinks({
  locale,
  variant,
}: {
  locale: Locale;
  variant: "bar" | "rail";
}) {
  const t = getDictionary(locale);

  // Screen readers get the group name on each link too. Without it the two
  // links announce as "Sign in" and "Sign up" with no hint of where they go,
  // and both leave the site.
  const signInLabel = `${t.header.clubsAndCoaches}: ${t.header.signIn}`;
  const signUpLabel = `${t.header.clubsAndCoaches}: ${t.header.signUp}`;

  if (variant === "rail") {
    return (
      <>
        <li
          className="shrink-0 self-center text-sm font-semibold text-[var(--color-text-secondary)]"
          aria-hidden="true"
        >
          {t.header.clubsAndCoaches}
        </li>
        <li className="shrink-0">
          <a
            className="nav-link"
            href={CLUB_SIGN_IN_URL}
            rel="noopener"
            aria-label={signInLabel}
          >
            {t.header.signIn}
          </a>
        </li>
        <li className="shrink-0">
          <a
            className="nav-link"
            href={CLUB_SIGN_UP_URL}
            rel="noopener"
            aria-label={signUpLabel}
          >
            {t.header.signUp}
          </a>
        </li>
      </>
    );
  }

  return (
    <div className="ml-6 hidden shrink-0 items-center gap-3 lg:flex">
      <span
        className="text-sm font-semibold text-[var(--color-text-secondary)]"
        aria-hidden="true"
      >
        {t.header.clubsAndCoaches}
      </span>
      <a
        className="nav-link"
        href={CLUB_SIGN_IN_URL}
        rel="noopener"
        aria-label={signInLabel}
      >
        {t.header.signIn}
      </a>
      <a
        className="btn-secondary !px-3 !py-1.5 text-sm"
        href={CLUB_SIGN_UP_URL}
        rel="noopener"
        aria-label={signUpLabel}
      >
        {t.header.signUp}
      </a>
    </div>
  );
}
