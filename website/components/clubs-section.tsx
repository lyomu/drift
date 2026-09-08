/**
 * The away fixture: the club-admin track. Player-first page, so clubs get
 * one honest section with a real contact action (mailto) — no fake demo,
 * no invented pricing.
 *
 * The aerial court photograph replaces the checklist's right-hand column as
 * the section's visual anchor; the checklist moves under the copy, which
 * also stops this card from reading like the chapter cards above it.
 */
import Image from "next/image";

import { clubs } from "@/lib/content";
import { images } from "@/lib/images";

export function ClubsSection() {
  const photo = images.clubs;

  return (
    <section
      id="clubs"
      className="reveal mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"
      aria-labelledby="clubs-heading"
    >
      <div className="drift-card overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_minmax(0,26rem)]">
          <div className="p-8 lg:p-12">
            <p className="badge badge-primary">For clubs &amp; academies</p>
            <h2
              id="clubs-heading"
              className="court-rule display-lg mt-4 pb-1"
            >
              {clubs.title}
            </h2>
            <p className="mt-8 leading-relaxed text-[var(--color-text-secondary)]">
              {clubs.body}
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2" role="list">
              {clubs.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-xl bg-[var(--color-background)] p-4"
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

            <a href={clubs.cta.href} className="btn-primary mt-8">
              {clubs.cta.text}
            </a>
          </div>

          {/* Sits flush to the card's edge — the only photograph on the page
              that is not full-bleed or framed, which keeps the clubs track
              visually distinct from the player chapters. */}
          <div className="relative min-h-64 lg:min-h-full">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 26rem, 100vw"
              className="object-cover"
              style={{ objectPosition: photo.focal }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
