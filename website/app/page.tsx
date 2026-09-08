/**
 * Drift Tennis — public landing page.
 *
 * DIRECTION CONTRACT (revised 2026-09)
 * THESIS: the page is a season told in three chapters, not five equal
 * rounds. The earlier version rendered five structurally identical sections
 * from one map, which read as one section shown five times; the competition
 * vocabulary survives, the repetition does not. The five-stage product loop
 * is not lost in the merge — `LoopStrip` names every stage immediately after
 * the hero (PRODUCT.md principle 1), and each merged chapter keeps its
 * second stage intact as a coda with its own heading and treatment.
 * OWN-WORLD: Drift's committed identity — #1c91d0 carrying full regions,
 * white 16px soft cards, DM Sans at zero tracking, tabular scoreline
 * numerals. New in this revision: photography carries the large regions
 * that flat colour used to, always under a primary-dark scrim so white type
 * clears AA and the brand still owns the field.
 * STORY: the visitor understands Drift turns "I should play more tennis"
 * into an actual match inside one app; believes results and standings here
 * are verified and structured; joins the waitlist.
 * FIRST VIEWPORT: the headline over a real court — struck-through "I should
 * play more tennis" resolving into "You have a match on Saturday." — with an
 * illustrative fixture card and challenge card as proof beside it.
 * FORM: chapter rhythm. No two sections share a layout: portrait photo
 * alongside (1), device frame (2), full-bleed photo band (3), each with a
 * different treatment again for its coda.
 * HONESTY: no testimonials, counts, prices or store links — none exist. App
 * UI is built from divs and labelled illustrative everywhere it appears.
 */
import { ChapterSection, PadelSection } from "@/components/chapter-section";
import { ClubsSection } from "@/components/clubs-section";
import { Hero } from "@/components/hero";
import { LoopStrip } from "@/components/loop-strip";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StandingsTable } from "@/components/standings-table";
import { TheFinal } from "@/components/the-final";
import { chapters, padel } from "@/lib/content";
import { images } from "@/lib/images";

/**
 * Each chapter's opening treatment, pinned here rather than in the content
 * layer: this is a layout decision, and `content.ts` stays about words.
 */
const CHAPTER_LAYOUT = [
  { photo: images.discover, variant: "photo-side" },
  { photo: images.compete, variant: "screens" },
  { photo: images.improve, variant: "photo-band" },
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <LoopStrip />

        {chapters.map((chapter, index) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            photo={CHAPTER_LAYOUT[index].photo}
            variant={CHAPTER_LAYOUT[index].variant}
          />
        ))}

        {/* Standings closes the competing half of the story: the payoff for
            everything chapters 1 and 2 set up. */}
        <StandingsTable />

        <PadelSection content={padel} />
        <ClubsSection />
        <TheFinal />
      </main>
      <SiteFooter />
    </>
  );
}
