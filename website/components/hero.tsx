/**
 * The first viewport.
 *
 * The old hero painted a flat primary-light half-field and floated two cards
 * on it — correct in grammar, inert on arrival. This one puts the headline
 * over a real court, which is what the page is actually about, and keeps the
 * product's own fixture card as the proof beside it.
 *
 * The copy is unchanged: the struck-through intention resolving into a
 * scheduled match is the strongest line on the site.
 *
 * Contrast: white type sits on `.scrim-hero`, which washes the photograph in
 * primary-dark rather than neutral black — the brand still carries the
 * region, and body copy stays at white/90 or above (DESIGN.md).
 */
import Image from "next/image";
import Link from "next/link";

import { ChallengeCard, FixtureCard, IllustrativeLabel } from "./app-screens";
import { images } from "@/lib/images";

export function Hero() {
  const photo = images.hero;

  return (
    <section id="top" data-on-primary className="relative isolate">
      {/* The photograph is the section's ground, not an element inside it:
          it spans the full bleed and the grid sits on top. `priority` because
          this is the LCP element on every visit. */}
      <div className="scrim-hero absolute inset-0 -z-10 overflow-hidden">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          priority
          sizes="100vw"
          className="hero-photo object-cover"
          style={{ objectPosition: photo.focal }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.35fr_0.85fr] lg:items-center lg:gap-14 lg:pb-20 lg:pt-16">
        <div>
          <p className="badge enter enter-1 bg-white/15 text-white backdrop-blur-sm">
            Tennis first · Padel too
          </p>

          <h1 className="display-xl enter enter-2 mt-5 max-w-4xl text-white">
            <span className="block text-white/70 line-through decoration-[#ff8a8a] decoration-2">
              &ldquo;I should play more tennis.&rdquo;
            </span>
            <span className="mt-1 block">You have a match on Saturday.</span>
          </h1>

          <p className="enter enter-3 mt-5 max-w-2xl text-lg leading-relaxed text-white/90">
            Drift Tennis finds you opponents at your level, schedules the match,
            records the result both players confirm, and turns your season into
            a rating you can trust. Tennis leads, padel runs on the same rails,
            and both live in one app instead of a booking site, three WhatsApp
            groups and a spreadsheet ladder.
          </p>

          <div className="enter enter-4 mt-8 flex flex-wrap gap-3">
            <Link
              href="/waitlist"
              className="btn-primary !bg-white !text-[var(--color-primary-dark)] hover:!bg-[var(--color-primary-light)]"
            >
              Join the waitlist
            </Link>
            <a
              href="#discover"
              className="btn-secondary !border-white/45 !bg-white/10 !text-white backdrop-blur-sm hover:!border-white hover:!bg-white/20"
            >
              How a season works ↓
            </a>
          </div>

          <p className="enter enter-4 mt-4 text-sm text-white/80">
            Free to join while we get going. Android first, iOS follows.
          </p>
        </div>

        {/* The product, shown rather than described. Two cards from the two
            ends of the loop: a settled fixture and an incoming challenge. */}
        <div className="enter enter-5 lg:pl-6">
          <div className="mx-auto w-full max-w-sm space-y-4">
            <FixtureCard />
            <div className="px-4 sm:px-8">
              <ChallengeCard />
            </div>
          </div>
          <IllustrativeLabel tone="on-primary" className="mt-4 text-center" />
        </div>
      </div>
    </section>
  );
}
