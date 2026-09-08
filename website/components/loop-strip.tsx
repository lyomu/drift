/**
 * The product loop, named in full.
 *
 * The page tells its story in three chapters, but the product is five stages
 * (PRODUCT.md principle 1: "the loop wins"). This strip is where the two
 * reconcile — every stage is named here, in order, immediately after the
 * hero, so nothing is hidden by the merge. It is wayfinding, not a feature
 * list: one line each, no cards, no icons.
 */
import { loopStages } from "@/lib/content";

export function LoopStrip() {
  return (
    <section
      aria-labelledby="loop-heading"
      className="border-y border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-14">
        <h2
          id="loop-heading"
          className="text-sm font-semibold text-[var(--color-text-secondary)]"
        >
          One loop, five stages, and you re-enter it every week
        </h2>

        {/* The rule lives in a positioned wrapper rather than inside the list.
            As a child of the `.reveal-stagger` list it counted as
            `nth-child(1)`, which pushed every stage's stagger one step late
            and left the fifth with no rule at all. */}
        <div className="relative mt-8">
          <span
            aria-hidden="true"
            className="draw-line pointer-events-none absolute left-0 right-0 top-[0.375rem] hidden h-px bg-[var(--color-border)] lg:block"
          />

          <ol className="reveal-stagger grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {loopStages.map((stage) => (
              <li key={stage.name} className="loop-node relative">
                <p className="text-sm font-bold text-[var(--color-primary-dark)]">
                  {stage.name}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {stage.line}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
