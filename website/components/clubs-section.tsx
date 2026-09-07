/**
 * The away fixture: the club-admin track. Player-first page, so clubs get
 * one honest section with a real contact action (mailto) — no fake demo,
 * no invented pricing.
 */
import { clubs } from "@/lib/content";

export function ClubsSection() {
  return (
    <section
      id="clubs"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"
      aria-labelledby="clubs-heading"
    >
      <div className="drift-card p-8 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="badge badge-primary">For clubs &amp; academies</p>
            <h2
              id="clubs-heading"
              className="mt-4 text-3xl font-bold lg:text-4xl"
            >
              {clubs.title}
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--color-text-secondary)]">
              {clubs.body}
            </p>
            <a href={clubs.cta.href} className="btn-primary mt-8">
              {clubs.cta.text}
            </a>
          </div>

          <ul className="flex flex-col gap-3" role="list">
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
        </div>
      </div>
    </section>
  );
}
