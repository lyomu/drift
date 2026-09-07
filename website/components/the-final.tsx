/**
 * The Final: the download CTA. Sits on the deepest brand field — the page's
 * close, and the anchor of the season metaphor.
 *
 * Store links do not exist yet (Play submission in progress, iOS follows),
 * so the store buttons state that honestly rather than pointing at a dead
 * link; the one live action is the notify-by-email link. This section is on
 * the replacement list: swap the notes for real badges at launch.
 */

export function TheFinal() {
  return (
    <section
      id="get-the-app"
      data-on-primary
      className="bg-[var(--color-primary-dark)] py-16 text-white lg:py-24"
      aria-labelledby="final-heading"
    >
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="badge !bg-white/10 text-white">The final</p>
        <h2 id="final-heading" className="mt-4 text-3xl font-bold lg:text-5xl">
          Your season starts with one match
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white">
          Sign up, take the assessment, and Drift does the rest — opponents at
          your level, the fixture on your calendar, and a rating that moves
          only when results are confirmed.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span
            className="btn-primary !bg-white !text-[var(--color-primary-dark)] cursor-default"
            aria-disabled="true"
            title="Google Play listing in progress"
          >
            Get it on Google Play — soon
          </span>
          <span
            className="btn-secondary !border-white/40 !bg-transparent !text-white cursor-default"
            aria-disabled="true"
            title="iOS follows Android"
          >
            App Store — later
          </span>
        </div>
        <p className="mt-6 text-sm text-white/90">
          Android first, iOS follows. 18+ at launch. Want to know the moment
          it&apos;s live?{" "}
          <a
            href="mailto:drift@einsbrand.com?subject=Notify%20me%20at%20launch"
            className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
          >
            Email us and we&apos;ll tell you.
          </a>
        </p>
      </div>
    </section>
  );
}
