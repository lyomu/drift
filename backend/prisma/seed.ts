import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AssessmentBranch,
  AssessmentPillar,
  CourtSurface,
  LearningContentType,
  MatchSport,
  NewsCategory,
  PrismaClient,
} from '@prisma/client';

/**
 * No create/manage-league API exists this phase (Phase M8) — per the
 * decision recorded in PROGRESS.md, leagues/seasons are seeded directly
 * rather than inventing an organizer surface ahead of the Club Admin app
 * (M14+). Registration windows here are deliberately short (minutes, not
 * weeks) so the full lazy-progression path — registration closing, Round 1
 * opening, a round's deadline passing, standings updating — can be watched
 * end-to-end in one manual test session. A real deployment would seed
 * production-realistic dates the same way: directly via the database.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const MINUTE_MS = 60 * 1000;

interface SeedCourtGroup {
  surface: CourtSurface;
  indoor: boolean;
  lighting: boolean;
  count: number;
}

interface SeedCourt {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  clubId: string | null;
  phone: string | null;
  website: string | null;
  bookingType: 'UNKNOWN' | 'CONTACT_ONLY' | 'EXTERNAL_LINK';
  bookingUrl: string | null;
  amenities: string[];
  openingHoursNote: string | null;
  isPublic: boolean | null;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  groups: SeedCourtGroup[];
}

/**
 * No create/manage-court or -club API exists this phase either (Phase M9,
 * same "no organizer surface ahead of the Club Admin app" decision as M8's
 * leagues). ~10 courts and 3 clubs near the London coordinates already used
 * by the onboarding/discovery/competitions e2e specs, so manual testing and
 * e2e both exercise the same seeded set.
 *
 * Deliberately sparse on most rows — only 3 courts and 2 clubs are
 * VERIFIED with full contact/booking detail; the rest are UNVERIFIED with
 * genuinely missing phone/website/hours/booking info. This isn't an
 * oversight: `foundation/06-domain-technical-architecture.md` §2 forbids
 * fabricating venue data, and the sparse rows are what prove the "renders
 * as Unknown, not guessed" path actually gets exercised, both in the e2e
 * spec and in manual QA.
 */
async function seedCourtsAndClubs() {
  const clubs = [
    {
      id: 'seed-club-hurlingham',
      name: 'Hurlingham Club',
      description:
        "A private members' club on the Thames with grass tennis courts.",
      address: 'Ranelagh Gardens, Fulham, London SW6 3PR',
      latitude: 51.4713,
      longitude: -0.197,
      phone: '+44 20 7736 8411',
      website: 'https://www.hurlinghamclub.org.uk',
      amenities: ['Clubhouse', 'Swimming pool', 'Restaurant'],
      openingHoursNote: 'Members and guests only.',
      photoUrls: [] as string[],
      verificationStatus: 'VERIFIED' as const,
    },
    {
      id: 'seed-club-wimbledon-park',
      name: 'Wimbledon Park Sports Club',
      description: 'A community sports club with mixed-surface tennis courts.',
      address: 'Wimbledon Park, London SW19',
      latitude: 51.4351,
      longitude: -0.214,
      phone: null,
      website: 'https://www.wpsc.org.uk',
      amenities: ['Clubhouse'],
      openingHoursNote: null,
      photoUrls: [] as string[],
      verificationStatus: 'VERIFIED' as const,
    },
    {
      id: 'seed-club-riverside',
      name: 'Riverside Tennis Community',
      description:
        'A social tennis community for casual and league play — owns no courts of its own yet, members play at whichever public court suits.',
      address: null,
      latitude: null,
      longitude: null,
      phone: null,
      website: null,
      amenities: [] as string[],
      openingHoursNote: null,
      photoUrls: [] as string[],
      verificationStatus: 'UNVERIFIED' as const,
    },
  ];

  for (const { id, ...fields } of clubs) {
    await prisma.club.upsert({
      where: { id },
      update: fields,
      create: { id, ...fields },
    });
  }

  const courts: SeedCourt[] = [
    {
      id: 'seed-court-regents-park',
      name: "Regent's Park Hard Courts",
      address: "Regent's Park, London NW1 4NR",
      latitude: 51.5313,
      longitude: -0.157,
      clubId: null,
      phone: '+44 300 061 2300',
      website:
        'https://www.royalparks.org.uk/parks/the-regents-park/sport/tennis',
      bookingType: 'EXTERNAL_LINK',
      bookingUrl:
        'https://www.royalparks.org.uk/parks/the-regents-park/sport/tennis',
      amenities: ['Floodlit', 'Pay and play'],
      openingHoursNote: 'Daily, 7am-dusk.',
      isPublic: true,
      verificationStatus: 'VERIFIED',
      groups: [{ surface: 'HARD', indoor: false, lighting: true, count: 6 }],
    },
    {
      id: 'seed-court-vauxhall-tennis',
      name: 'Vauxhall Park Tennis Courts',
      address: 'Fentiman Rd, London SW8 1JY',
      latitude: 51.4816,
      longitude: -0.1226,
      clubId: null,
      phone: '+44 20 7926 9000',
      website: null,
      bookingType: 'CONTACT_ONLY',
      bookingUrl: null,
      amenities: ['Pay and play'],
      openingHoursNote: null,
      isPublic: true,
      verificationStatus: 'VERIFIED',
      groups: [{ surface: 'HARD', indoor: false, lighting: false, count: 4 }],
    },
    {
      id: 'seed-court-islington-clay',
      name: 'Islington Clay Courts',
      address: null,
      latitude: 51.5416,
      longitude: -0.1022,
      clubId: null,
      phone: null,
      website: null,
      bookingType: 'UNKNOWN',
      bookingUrl: null,
      amenities: [],
      openingHoursNote: null,
      isPublic: null,
      verificationStatus: 'UNVERIFIED',
      groups: [{ surface: 'CLAY', indoor: false, lighting: false, count: 2 }],
    },
    {
      id: 'seed-court-westway-indoor',
      name: 'Westway Sports Centre',
      address: '1 Crowthorne Rd, London W10 6RP',
      latitude: 51.5209,
      longitude: -0.2246,
      clubId: null,
      phone: '+44 20 8969 0992',
      website: 'https://www.westway.org',
      bookingType: 'EXTERNAL_LINK',
      bookingUrl: 'https://www.westway.org/tennis',
      amenities: ['Indoor courts', 'Coaching available', 'Cafe'],
      openingHoursNote: 'Daily, 7am-10pm.',
      isPublic: true,
      verificationStatus: 'VERIFIED',
      groups: [
        { surface: 'HARD', indoor: true, lighting: true, count: 4 },
        { surface: 'HARD', indoor: false, lighting: true, count: 2 },
      ],
    },
    {
      id: 'seed-court-battersea-park',
      name: 'Battersea Park Tennis Courts',
      address: null,
      latitude: 51.4791,
      longitude: -0.1567,
      clubId: null,
      phone: null,
      website: null,
      bookingType: 'UNKNOWN',
      bookingUrl: null,
      amenities: [],
      openingHoursNote: null,
      isPublic: true,
      verificationStatus: 'UNVERIFIED',
      groups: [
        { surface: 'HARD', indoor: false, lighting: true, count: 4 },
        { surface: 'HARD', indoor: false, lighting: false, count: 4 },
      ],
    },
    {
      id: 'seed-court-highbury-club',
      name: 'Highbury Fields Courts',
      address: null,
      latitude: 51.5486,
      longitude: -0.0996,
      clubId: null, // independent — no club owns this one, by design.
      phone: '+44 20 7527 4972',
      website: null,
      bookingType: 'CONTACT_ONLY',
      bookingUrl: null,
      amenities: [],
      openingHoursNote: null,
      isPublic: true,
      verificationStatus: 'UNVERIFIED',
      groups: [{ surface: 'HARD', indoor: false, lighting: false, count: 3 }],
    },
    {
      id: 'seed-court-hurlingham',
      name: 'Hurlingham Club Courts',
      address: 'Ranelagh Gardens, Fulham, London SW6 3PR',
      latitude: 51.4713,
      longitude: -0.197,
      clubId: 'seed-club-hurlingham',
      phone: '+44 20 7736 8411',
      website: 'https://www.hurlinghamclub.org.uk',
      bookingType: 'CONTACT_ONLY',
      bookingUrl: null,
      amenities: ['Grass courts', 'Clubhouse'],
      openingHoursNote: 'Members and guests only.',
      isPublic: false,
      verificationStatus: 'VERIFIED',
      groups: [{ surface: 'GRASS', indoor: false, lighting: false, count: 6 }],
    },
    {
      id: 'seed-court-camden-astro',
      name: 'Camden Leisure Centre Courts',
      address: null,
      latitude: 51.539,
      longitude: -0.1426,
      clubId: null,
      phone: null,
      website: null,
      bookingType: 'UNKNOWN',
      bookingUrl: null,
      amenities: [],
      openingHoursNote: null,
      isPublic: true,
      verificationStatus: 'UNVERIFIED',
      groups: [
        {
          surface: 'ARTIFICIAL_GRASS',
          indoor: false,
          lighting: false,
          count: 2,
        },
      ],
    },
    {
      id: 'seed-court-clapham-common',
      name: 'Clapham Common Courts',
      address: null,
      latitude: 51.4618,
      longitude: -0.1479,
      clubId: null,
      phone: null,
      website: null,
      bookingType: 'UNKNOWN',
      bookingUrl: null,
      amenities: [],
      openingHoursNote: null,
      isPublic: null, // genuinely unknown — never guessed.
      verificationStatus: 'UNVERIFIED',
      groups: [{ surface: 'HARD', indoor: false, lighting: false, count: 4 }],
    },
    {
      id: 'seed-court-wimbledon-park',
      name: 'Wimbledon Park Courts',
      address: 'Wimbledon Park, London SW19',
      latitude: 51.4351,
      longitude: -0.214,
      clubId: 'seed-club-wimbledon-park',
      phone: null,
      website: 'https://www.wpsc.org.uk',
      bookingType: 'EXTERNAL_LINK',
      bookingUrl: 'https://www.wpsc.org.uk/book',
      amenities: ['Clubhouse'],
      openingHoursNote: null,
      isPublic: true,
      verificationStatus: 'VERIFIED',
      groups: [
        { surface: 'HARD', indoor: false, lighting: false, count: 5 },
        { surface: 'GRASS', indoor: false, lighting: false, count: 3 },
      ],
    },
  ];

  for (const { id, groups, ...fields } of courts) {
    await prisma.court.upsert({
      where: { id },
      update: { ...fields, courtGroups: { deleteMany: {}, create: groups } },
      create: { id, ...fields, courtGroups: { create: groups } },
    });
  }

  const verifiedCourts = courts.filter(
    (c) => c.verificationStatus === 'VERIFIED',
  ).length;
  const verifiedClubs = clubs.filter(
    (c) => c.verificationStatus === 'VERIFIED',
  ).length;
  console.log(
    `Seeded ${courts.length} courts (${verifiedCourts} verified) and ${clubs.length} clubs (${verifiedClubs} verified) near London.`,
  );
}

interface SeedContent {
  id: string;
  type: LearningContentType;
  targetSkill: AssessmentPillar;
  branch: AssessmentBranch | null;
  title: string;
  summary: string;
  bodyText: string | null;
  videoUrl: string | null;
  durationMinutes: number | null;
}

/**
 * No Club/Platform Admin content-authoring UI exists yet (same gap as M9's
 * courts) — seeded directly, PUBLISHED by default. One or two pieces per
 * skill dimension, deliberately mixing `branch: null` (any level) with a
 * specific branch, so the branch-ranking in `learning/skill-score.ts`'s
 * `recommendContent` has real cases to sort between.
 */
async function seedLearningContent() {
  const content: SeedContent[] = [
    {
      id: 'seed-learning-forehand-fundamentals',
      type: LearningContentType.LESSON,
      targetSkill: AssessmentPillar.FOREHAND,
      branch: null,
      title: 'Forehand Fundamentals',
      summary:
        'Grip, stance, and swing path — the building blocks of a repeatable forehand.',
      bodyText:
        '1. Semi-western grip. 2. Unit turn early. 3. Low-to-high swing path. 4. Follow through over the shoulder.',
      videoUrl: null,
      durationMinutes: 8,
    },
    {
      id: 'seed-learning-forehand-crosscourt-drill',
      type: LearningContentType.DRILL,
      targetSkill: AssessmentPillar.FOREHAND,
      branch: AssessmentBranch.BEGINNER,
      title: 'Cross-Court Forehand Drill',
      summary: 'Rally cross-court forehands to build consistency and depth.',
      bodyText:
        'Rally cross-court forehands only, aiming past the service line, for 10 minutes. Reset if you hit the net twice in a row.',
      videoUrl: null,
      durationMinutes: 10,
    },
    {
      id: 'seed-learning-backhand-basics',
      type: LearningContentType.LESSON,
      targetSkill: AssessmentPillar.BACKHAND,
      branch: AssessmentBranch.BEGINNER,
      title: 'Backhand Basics',
      summary: 'One-handed or two — the fundamentals that apply to both.',
      bodyText:
        '1. Turn shoulders early. 2. Non-dominant hand guides the take-back. 3. Contact point out in front.',
      videoUrl: null,
      durationMinutes: 8,
    },
    {
      id: 'seed-learning-backhand-consistency-drill',
      type: LearningContentType.DRILL,
      targetSkill: AssessmentPillar.BACKHAND,
      branch: null,
      title: 'Backhand Consistency Drill',
      summary: 'Down-the-line backhands, focused on clean contact over power.',
      bodyText:
        'Hit 20 down-the-line backhands, counting consecutive clean contacts. Rest, then try to beat your streak.',
      videoUrl: null,
      durationMinutes: 12,
    },
    {
      id: 'seed-learning-serve-mechanics',
      type: LearningContentType.LESSON,
      targetSkill: AssessmentPillar.SERVE,
      branch: null,
      title: 'Serve Mechanics',
      summary:
        'Toss, trophy position, and the kinetic chain of a reliable serve.',
      bodyText:
        '1. Consistent toss height and placement. 2. Trophy position with racket up. 3. Drive up through contact.',
      videoUrl: null,
      durationMinutes: 10,
    },
    {
      id: 'seed-learning-serve-placement-drill',
      type: LearningContentType.DRILL,
      targetSkill: AssessmentPillar.SERVE,
      branch: AssessmentBranch.INTERMEDIATE,
      title: 'Serve Placement Drill',
      summary:
        'Target the corners of the service box to build placement, not just power.',
      bodyText:
        'Serve 10 balls at each service-box corner (wide, body, T). Track how many land in.',
      videoUrl: null,
      durationMinutes: 15,
    },
    {
      id: 'seed-learning-return-positioning-drill',
      type: LearningContentType.DRILL,
      targetSkill: AssessmentPillar.RETURN,
      branch: null,
      title: 'Return Positioning Drill',
      summary: 'Adjust return position based on serve speed and placement.',
      bodyText:
        'Have a partner serve from three positions; practise stepping in on second serves and staying back on firsts.',
      videoUrl: null,
      durationMinutes: 12,
    },
    {
      id: 'seed-learning-net-play-essentials',
      type: LearningContentType.LESSON,
      targetSkill: AssessmentPillar.NET_PLAY,
      branch: null,
      title: 'Net Play Essentials',
      summary:
        'Split-step timing and volley technique for coming forward with confidence.',
      bodyText:
        '1. Split-step as your opponent contacts the ball. 2. Short, punchy volley motion. 3. Watch the ball onto the strings.',
      videoUrl: null,
      durationMinutes: 8,
    },
    {
      id: 'seed-learning-volley-reaction-drill',
      type: LearningContentType.DRILL,
      targetSkill: AssessmentPillar.NET_PLAY,
      branch: AssessmentBranch.BEGINNER,
      title: 'Volley Reaction Drill',
      summary: 'Quick-fire volleys from close range to sharpen reaction time.',
      bodyText:
        'Stand inside the service line; a partner feeds balls at moderate pace for you to volley back, 5 minutes on, 2 off.',
      videoUrl: null,
      durationMinutes: 5,
    },
    {
      id: 'seed-learning-split-step-drill',
      type: LearningContentType.DRILL,
      targetSkill: AssessmentPillar.MOVEMENT,
      branch: null,
      title: 'Split-Step Footwork Drill',
      summary:
        "Build the habit of splitting on your opponent's contact for faster first steps.",
      bodyText:
        'Shadow-rally without a ball, split-stepping on an imagined contact every 2 seconds, for 5 minutes.',
      videoUrl: null,
      durationMinutes: 5,
    },
    {
      id: 'seed-learning-match-tactics-101',
      type: LearningContentType.LESSON,
      targetSkill: AssessmentPillar.MATCH_PLAY,
      branch: null,
      title: 'Match Tactics 101',
      summary: 'Simple, repeatable tactical patterns for singles play.',
      bodyText:
        "1. Play to your opponent's weaker side. 2. Construct points, don't force winners early. 3. Track patterns that are working.",
      videoUrl: null,
      durationMinutes: 10,
    },
  ];

  for (const { id, ...fields } of content) {
    await prisma.learningContent.upsert({
      where: { id },
      update: fields,
      create: { id, ...fields },
    });
  }

  const planId = 'seed-learning-plan-beginner-groundstrokes';
  await prisma.learningContent.upsert({
    where: { id: planId },
    update: {
      type: LearningContentType.TRAINING_PLAN,
      targetSkill: AssessmentPillar.FOREHAND,
      branch: AssessmentBranch.BEGINNER,
      title: 'Beginner Groundstrokes Plan',
      summary:
        'A three-step sequence to build consistent forehands and backhands.',
      bodyText: null,
      videoUrl: null,
      durationMinutes: null,
      steps: {
        deleteMany: {},
        create: [
          { order: 1, contentId: 'seed-learning-forehand-fundamentals' },
          { order: 2, contentId: 'seed-learning-forehand-crosscourt-drill' },
          { order: 3, contentId: 'seed-learning-backhand-basics' },
        ],
      },
    },
    create: {
      id: planId,
      type: LearningContentType.TRAINING_PLAN,
      targetSkill: AssessmentPillar.FOREHAND,
      branch: AssessmentBranch.BEGINNER,
      title: 'Beginner Groundstrokes Plan',
      summary:
        'A three-step sequence to build consistent forehands and backhands.',
      steps: {
        create: [
          { order: 1, contentId: 'seed-learning-forehand-fundamentals' },
          { order: 2, contentId: 'seed-learning-forehand-crosscourt-drill' },
          { order: 3, contentId: 'seed-learning-backhand-basics' },
        ],
      },
    },
  });

  console.log(
    `Seeded ${content.length} lessons/drills + 1 training plan across all 7 skill dimensions.`,
  );
}

interface SeedStory {
  id: string;
  headline: string;
  highlight: string;
  imageUrl: string | null;
  publicationDate: Date;
  categories: NewsCategory[];
  topics: string[];
  originalUrl: string;
}

/**
 * No RSS/API ingestion pipeline exists yet — same "no admin surface, seed
 * directly" gap as M9's courts and M10's learning content. The seeded
 * source is deliberately a fictional in-house name ("Drift Tennis Digest"),
 * never a real outlet — inventing headlines and attributing them to a real
 * publisher would misrepresent that publisher's actual reporting, which is
 * a harder line than the "never fabricate" rule Doc 6 §2 applies to venue
 * data. Real source ingestion needs a genuine licensed/RSS integration,
 * tracked as an open dependency in PROGRESS.md.
 */
async function seedNews() {
  const source = await prisma.newsSource.upsert({
    where: { id: 'seed-source-drift-digest' },
    update: { name: 'Drift Tennis Digest', status: 'ACTIVE' },
    create: {
      id: 'seed-source-drift-digest',
      name: 'Drift Tennis Digest',
      status: 'ACTIVE',
    },
  });

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const stories: SeedStory[] = [
    {
      id: 'seed-story-serve-clinic',
      headline: 'Weekend serve clinics popping up at local clubs',
      highlight:
        'Several community clubs are running free serve-technique clinics this month — a good low-pressure way to get coached feedback outside of lessons.',
      imageUrl: null,
      publicationDate: new Date(now - 1 * DAY_MS),
      categories: [NewsCategory.LATEST, NewsCategory.LOCAL],
      topics: ['serve', 'coaching'],
      originalUrl: 'https://example.com/drift-digest/serve-clinics',
    },
    {
      id: 'seed-story-club-league-growth',
      headline: 'Community leagues see a rise in weekday sign-ups',
      highlight:
        'Round-robin club leagues are reporting more weekday registrations as flexible-schedule players look for lower-commitment competitive play.',
      imageUrl: null,
      publicationDate: new Date(now - 2 * DAY_MS),
      categories: [NewsCategory.COMMUNITY, NewsCategory.CLUBS],
      topics: ['leagues', 'community'],
      originalUrl: 'https://example.com/drift-digest/league-growth',
    },
    {
      id: 'seed-story-african-tennis-development',
      headline:
        'Grassroots programmes expanding access to tennis across Africa',
      highlight:
        'A round-up of community coaching initiatives working to make racket sports more accessible in under-served areas.',
      imageUrl: null,
      publicationDate: new Date(now - 3 * DAY_MS),
      categories: [NewsCategory.AFRICA, NewsCategory.COMMUNITY],
      topics: ['grassroots', 'development'],
      originalUrl: 'https://example.com/drift-digest/africa-development',
    },
    {
      id: 'seed-story-tour-season-preview',
      headline: 'What to watch for as the pro tour season heats up',
      highlight:
        'A quick preview of the storylines worth following as the professional calendar moves into its next stretch.',
      imageUrl: null,
      publicationDate: new Date(now - 4 * DAY_MS),
      categories: [NewsCategory.PROFESSIONAL_TENNIS, NewsCategory.TOURNAMENTS],
      topics: ['tour', 'season-preview'],
      originalUrl: 'https://example.com/drift-digest/tour-preview',
    },
    {
      id: 'seed-story-player-spotlight',
      headline: 'Player Spotlight: the comeback stories worth following',
      highlight:
        'A look at a few players working their way back from injury layoffs this season.',
      imageUrl: null,
      publicationDate: new Date(now - 5 * DAY_MS),
      categories: [NewsCategory.PLAYERS],
      topics: ['player-spotlight'],
      originalUrl: 'https://example.com/drift-digest/player-spotlight',
    },
  ];

  for (const { id, ...fields } of stories) {
    await prisma.newsStory.upsert({
      where: { id },
      update: { ...fields, sourceId: source.id },
      create: { id, sourceId: source.id, ...fields },
    });
  }

  console.log(`Seeded ${stories.length} news stories from 1 source.`);
}

async function main() {
  const now = Date.now();

  const league = await prisma.league.upsert({
    where: { id: 'seed-autumn-singles-league' },
    update: {},
    create: {
      id: 'seed-autumn-singles-league',
      sport: MatchSport.TENNIS,
      name: 'Autumn Singles League',
      description:
        'A friendly round-robin singles league — register, get paired each round, climb the standings.',
      rulesText:
        'Standard singles scoring. Best effort to schedule and play your fixture before the round deadline — an unplayed fixture is recorded as a walkover in favour of neither player.',
    },
  });

  const seasonId = 'seed-autumn-singles-season-1';
  const seasonDates = {
    registrationOpensAt: new Date(now),
    registrationClosesAt: new Date(now + 2 * MINUTE_MS),
    startsAt: new Date(now + 3 * MINUTE_MS),
    roundCount: 3,
    roundIntervalMinutes: 3,
  };

  // Re-running this script is a deliberate "reset the clock" action for
  // manual testing — wipe whatever a previous run already progressed
  // (rounds/fixtures cascade, registrations, standings) so the new dates
  // above aren't racing against stale state computed from the old ones.
  await prisma.round.deleteMany({ where: { seasonId } });
  await prisma.standing.deleteMany({ where: { seasonId } });
  await prisma.seasonRegistration.deleteMany({ where: { seasonId } });

  const season = await prisma.season.upsert({
    where: { id: seasonId },
    update: seasonDates,
    create: {
      id: seasonId,
      leagueId: league.id,
      label: 'Season 1',
      ...seasonDates,
    },
  });

  console.log(`Seeded league "${league.name}" with season "${season.label}".`);
  console.log(
    `Registration open now, closes in 2 min, season starts in 3 min, ~3 min per round.`,
  );

  await seedCourtsAndClubs();
  await seedLearningContent();
  await seedNews();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
