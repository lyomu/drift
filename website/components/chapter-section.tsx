/**
 * A chapter of the page.
 *
 * This replaces `round-section.tsx`, which rendered five structurally
 * identical sections from one map — the single biggest reason the page read
 * as flat. Here each chapter picks a `variant` for its opening, and the two
 * merged chapters render their second loop stage as a `coda` in a different
 * treatment again (a ruled list, not more cards), so no two screens repeat.
 *
 * The copy is unchanged from the five-round version; only its arrangement is.
 */
import Image from "next/image";

import { IllustrativeLabel, SkillProfileCard } from "./app-screens";
import type { Chapter } from "@/lib/content";
import type { SiteImage } from "@/lib/images";

type Variant = "photo-side" | "screens" | "photo-band";

function ItemCards({ items }: { items: Chapter["items"] }) {
  return (
    <ul className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.title} className="drift-card drift-card-interactive p-5">
          <span className={`badge ${item.badge.tone}`}>{item.badge.text}</span>
          <h3 className="mt-3 text-base font-bold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The second stage of a merged chapter. Deliberately not cards: a ruled list
 * beside its own heading, so a chapter that carries six items never shows six
 * identical tiles.
 */
function Coda({ coda }: { coda: NonNullable<Chapter["coda"]> }) {
  return (
    <div className="mt-16 border-t border-[var(--color-border)] pt-12 lg:mt-20 lg:grid lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14 lg:pt-14">
      <div>
        {/* Plain label, not a pill: the chapter headings above dropped
            theirs, and one lone chip here would read as a stray control. */}
        <p className="text-sm font-semibold text-[var(--color-primary-dark)]">
          {coda.name}
        </p>
        <h3 className="court-rule display-lg mt-3 pb-1">{coda.tagline}</h3>
        <p className="mt-8 text-base leading-relaxed text-[var(--color-text-secondary)]">
          {coda.intro}
        </p>
      </div>

      <ul className="reveal-stagger mt-10 divide-y divide-[var(--color-border)] lg:mt-0">
        {coda.items.map((item) => (
          <li key={item.title} className="py-5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-base font-bold">{item.title}</h4>
              <span className={`badge ${item.badge.tone}`}>
                {item.badge.text}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChapterSection({
  chapter,
  photo,
  variant,
}: {
  chapter: Chapter;
  photo: SiteImage;
  variant: Variant;
}) {
  const heading = (
    <>
      {/* The ordinal alone, no "Chapter N" label: the numbering is a visual
          rhythm, and spelling it out in a pill made every section open with
          the same piece of chrome. */}
      <span aria-hidden="true" className="chapter-numeral block">
        {chapter.label.replace("Chapter ", "")}
      </span>
      <h2 className="court-rule display-lg mt-2 max-w-xl pb-1">
        {chapter.tagline}
      </h2>
      <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
        {chapter.intro}
      </p>
    </>
  );

  /* Opening band: the photograph carries the heading, white on a primary
     wash. Used once on the page so it stays an event rather than a pattern. */
  if (variant === "photo-band") {
    return (
      <section id={chapter.id} className="reveal">
        <div
          data-on-primary
          className="scrim-band relative isolate overflow-hidden"
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="100vw"
            className="-z-10 object-cover"
            style={{ objectPosition: photo.focal }}
          />
          {/* `relative z-10` is load-bearing: the scrim is an
              absolutely-positioned ::after and the last child, so it wins
              on DOM order against z-index:auto. Without the explicit level
              here the copy renders *under* the wash. */}
          <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-white/90">
                {chapter.title}
              </p>
              <h2 className="display-lg mt-3 text-white">{chapter.tagline}</h2>
              <p className="mt-6 text-lg leading-relaxed text-white/90">
                {chapter.intro}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <ItemCards items={chapter.items} />
          {chapter.coda ? <Coda coda={chapter.coda} /> : null}
        </div>
      </section>
    );
  }

  /* Opening with the product itself: copy beside a phone showing a real
     product state. */
  if (variant === "screens") {
    return (
      <section
        id={chapter.id}
        className="reveal bg-[var(--color-surface)] py-16 lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-center lg:gap-16">
            <div>{heading}</div>
            <div>
              <div className="device-frame mx-auto max-w-xs">
                <div className="device-screen p-3">
                  <SkillProfileCard />
                </div>
              </div>
              <IllustrativeLabel className="mt-4 text-center" />
            </div>
          </div>

          <div className="mt-14">
            <ItemCards items={chapter.items} />

            {/* A wide strip marking the seam between this chapter's two loop
                stages — playing a match, then what a season of them adds up
                to. Carries no type, so it needs no scrim beyond the soft
                wash. */}
            <div className="photo-frame scrim-soft mt-16 aspect-[21/9] w-full lg:mt-20">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1280px) 72rem, 100vw"
                className="object-cover"
                style={{ objectPosition: photo.focal }}
              />
            </div>

            {chapter.coda ? <Coda coda={chapter.coda} /> : null}
          </div>
        </div>
      </section>
    );
  }

  /* Default: portrait photograph alongside the chapter opening. */
  return (
    <section id={chapter.id} className="reveal py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-center lg:gap-16">
          <div>{heading}</div>
          <div className="photo-frame scrim-soft aspect-[4/5] w-full">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 24rem, 100vw"
              className="object-cover"
              style={{ objectPosition: photo.focal }}
            />
          </div>
        </div>

        <div className="mt-14">
          <ItemCards items={chapter.items} />
          {chapter.coda ? <Coda coda={chapter.coda} /> : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Padel's own section (was a single tinted aside card until 2026-09-08).
 *
 * The positioning changed: padel is now co-billed rather than treated as a
 * coming-soon footnote. Tennis still leads the page and keeps the name, so
 * this sits after the three tennis-led chapters and the standings, not
 * among them. Keeps the tinted ground so it still reads as a distinct
 * track rather than a fourth chapter.
 */
export function PadelSection({
  content,
}: {
  content: {
    eyebrow: string;
    title: string;
    body: string;
    points: readonly string[];
  };
}) {
  return (
    <section
      id="padel"
      aria-labelledby="padel-heading"
      className="reveal mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-20"
    >
      <div className="rounded-2xl bg-[var(--color-primary-light)] p-8 lg:p-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-14">
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary-dark)]">
              {content.eyebrow}
            </p>
            <h2 id="padel-heading" className="display-lg mt-3">
              {content.title}
            </h2>
          </div>

          <div className="mt-6 lg:mt-0">
            <p className="leading-relaxed text-[var(--color-text-secondary)]">
              {content.body}
            </p>

            <ul className="reveal-stagger mt-6 grid gap-3 sm:grid-cols-2">
              {content.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="9"
                      fill="var(--color-primary-light)"
                    />
                    <path
                      d="m6 10.5 2.5 2.5L14 7.5"
                      stroke="var(--color-primary-dark)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
