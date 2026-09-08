/**
 * The Final: the page's close and its one real conversion action.
 *
 * This section used to render two non-functional store buttons — a `<span>`
 * reading "Get it on Google Play — soon" and another for iOS — because the
 * listings do not exist yet (Play submission in progress). Honest, but it
 * left the page with nothing to actually do. The waitlist replaces them: the
 * store note stays as context, the CTA is now live.
 *
 * Still no counts, no countdown, no "spots remaining" — DESIGN.md rule 4.
 */
import Image from "next/image";
import Link from "next/link";

import { images } from "@/lib/images";

export function TheFinal() {
  const photo = images.final;

  return (
    <section
      id="get-the-app"
      data-on-primary
      className="scrim-band reveal relative isolate overflow-hidden text-white"
      aria-labelledby="final-heading"
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="100vw"
        className="-z-10 object-cover"
        style={{ objectPosition: photo.focal }}
      />

      {/* `relative z-10` is load-bearing: `.scrim-band` is an absolutely-
          positioned ::after and the last child, so it wins on DOM order
          against z-index:auto. Without it the heading sits under the wash. */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:py-28">
        <p className="badge bg-white/15 text-white backdrop-blur-sm">
          The final
        </p>
        <h2 id="final-heading" className="display-lg mt-4">
          Your season starts with one match
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/90">
          Sign up, take the assessment, and Drift does the rest: opponents at
          your level, the fixture on your calendar, and a rating that moves
          only when results are confirmed.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/waitlist"
            className="btn-primary !bg-white !text-[var(--color-primary-dark)] hover:!bg-[var(--color-primary-light)]"
          >
            Join the waitlist
          </Link>
        </div>

        <p className="mt-6 text-sm text-white/90">
          Free to join while we get going. Android first, iOS follows. The app
          stores are not live yet, so the waitlist is how you hear about it first.
        </p>
      </div>
    </section>
  );
}
