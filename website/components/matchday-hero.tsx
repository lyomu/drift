/**
 * The first viewport is "matchday": the hook on the left, the product's
 * own match-fixture grammar on the right — two staggered cards showing the
 * loop's two ends (an upcoming fixture, an incoming challenge).
 *
 * The fixture content is illustrative UI, labelled as such on the card;
 * none of it is a claim about real users.
 */

function Avatar({ name, tone }: { name: string; tone: "light" | "raised" }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        tone === "light"
          ? "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]"
          : "bg-[var(--color-neutral-surface)] text-[var(--color-text-secondary)]"
      }`}
    >
      {initials}
    </span>
  );
}

function FixtureCard() {
  return (
    <div className="drift-card w-full max-w-sm p-5">
      <div className="flex items-center justify-between">
        <span className="badge badge-primary">Up next · Round 3</span>
        <span className="caption text-xs text-[var(--color-text-secondary)]">
          Doubles
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name="Njeri W." tone="light" />
          <div>
            <p className="text-sm font-semibold">Njeri &amp; Brian</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Rating 4.2
            </p>
          </div>
        </div>
        <span className="tabular text-lg font-bold text-[var(--color-text-secondary)]">
          vs
        </span>
        <div className="flex flex-row-reverse items-center gap-3">
          <Avatar name="Kevin M." tone="raised" />
          <div className="text-right">
            <p className="text-sm font-semibold">Kevin &amp; Achieng</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Rating 3.8
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        <div className="flex items-center justify-between">
          <p className="tabular text-sm font-semibold">Sat · 16:00</p>
          <span className="badge badge-success">✓ Time accepted</span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Club court suggested · 2 of 3 proposals settled
        </p>
      </div>
    </div>
  );
}

function ChallengeCard() {
  return (
    <div className="drift-card w-full max-w-xs p-4">
      <div className="flex items-center justify-between">
        <span className="badge badge-warning">Incoming challenge</span>
        <span className="text-xs text-[var(--color-text-secondary)]">2h</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name="Otieno K." tone="raised" />
        <div>
          <p className="text-sm font-semibold">Otieno challenged you</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Proposed: Sun 10:00 or 17:00
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="btn-primary !flex-1 !px-3 !py-1.5 text-xs">
          Accept
        </span>
        <span className="btn-secondary !flex-1 !px-3 !py-1.5 text-xs">
          Propose time
        </span>
      </div>
    </div>
  );
}

export function MatchdayHero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* A quiet primary-light field behind the product cards, so the first
          viewport reads as the brand before any scrolling. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[var(--color-primary-light)] lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 hidden h-72 w-72 rounded-full bg-[var(--color-surface)]/60 lg:block"
      />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pb-28 lg:pt-24">
        <div>
          <p className="badge badge-primary mb-5">Tennis first · Padel when you&apos;re ready</p>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
            <span className="text-[var(--color-text-secondary)] line-through decoration-[var(--color-error)]/50 decoration-2">
              &ldquo;I should play more tennis.&rdquo;
            </span>
            <br />
            <span className="text-[var(--color-primary-dark)]">
              You have a match on Saturday.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--color-text-secondary)]">
            Drift Tennis finds you opponents at your level, schedules the match,
            records the result both players confirm, and turns your season into
            a rating you can trust. One app instead of a booking site, three
            WhatsApp groups and a spreadsheet ladder.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#get-the-app" className="btn-primary">
              Get the app
            </a>
            <a href="#round-1" className="btn-secondary">
              How a season works ↓
            </a>
          </div>
        </div>

        <div className="relative lg:pl-8">
          <p className="mb-3 text-right text-xs text-[var(--color-text-secondary)]">
            Illustrative screens
          </p>
          {/* The brand field reaches mobile too, as a rounded backdrop
              behind the cards; desktop gets the full-height half field. */}
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-[var(--color-primary-light)] p-4 sm:items-end sm:p-6 lg:bg-transparent lg:p-0">
            <FixtureCard />
            <ChallengeCard />
          </div>
        </div>
      </div>
    </section>
  );
}
