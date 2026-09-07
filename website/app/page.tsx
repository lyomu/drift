/**
 * Drift Tennis — public landing page.
 *
 * DIRECTION CONTRACT
 * THESIS: the page IS a Drift league season — the visitor moves through the
 * product the way a player moves through a season (matchday → rounds →
 * full-time standings → the final), refusing the category-default
 * hero + three feature cards + testimonial arrangement.
 * OWN-WORLD: Drift's committed identity — #1c91d0 carrying full regions on
 * a #f7fafc ground, white 16px soft cards, DM Sans at zero tracking,
 * tabular scoreline numerals; competition vocabulary as the structural
 * language (rounds, fixtures, standings, the final).
 * STORY: the visitor understands Drift turns "I should play more tennis"
 * into an actual match inside one app; believes results and standings here
 * are verified and structured; gets the app.
 * FIRST VIEWPORT: matchday hero — struck-through "I should play more
 * tennis" resolving into "You have a match on Saturday." on the left;
 * two staggered illustrative fixture cards (up next / incoming challenge)
 * on a primary-light field; "Get the app" beside the headline.
 * FORM: fixture-board structure, candidate 3 of the grounded list (seed
 * key 13e7d07e); default scroll staging — the rounds rail carries
 * wayfinding, no challenger staging committed.
 */
import { ClubsSection } from "@/components/clubs-section";
import { MatchdayHero } from "@/components/matchday-hero";
import { PadelAside, RoundSection } from "@/components/round-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StandingsTable } from "@/components/standings-table";
import { TheFinal } from "@/components/the-final";
import { padelAside, rounds } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <MatchdayHero />

        {rounds.map((round, index) => (
          <RoundSection key={round.id} round={round} index={index} />
        ))}

        <PadelAside aside={padelAside} />
        <StandingsTable />
        <ClubsSection />
        <TheFinal />
      </main>
      <SiteFooter />
    </>
  );
}
