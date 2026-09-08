/**
 * All landing-page copy in one place.
 *
 * Rule: never fabricate. Every capability named here exists in the shipped
 * product (see PRODUCT.md "Capabilities and Constraints"). Fixtures,
 * standings rows and app screens shown on the page are illustrative and
 * labelled as such. Store links do not exist yet (Play submission in
 * progress) — the download CTA is honest about that.
 *
 * STRUCTURE: the page runs as three chapters rather than five equal rounds,
 * because five identical sections read as one section shown five times. The
 * product loop is not lost in the merge — `loopStages` names all five stages
 * explicitly (PRODUCT.md principle 1), and the two merged chapters keep the
 * second stage intact as a `coda` block with its own heading and copy.
 */

type Item = {
  title: string;
  body: string;
  badge: { text: string; tone: string };
};

export type Chapter = {
  id: string;
  label: string;
  /** Display heading for the chapter, e.g. "Play & Compete". */
  title: string;
  /** Loop stages this chapter covers, in order. */
  stages: string[];
  tagline: string;
  intro: string;
  items: Item[];
  /** The second loop stage, when a chapter merges two. */
  coda?: {
    name: string;
    tagline: string;
    intro: string;
    items: Item[];
  };
};

/**
 * The product loop, named in full so the three-chapter narrative never hides
 * a stage. Kept deliberately terse — this is a wayfinding strip, not a
 * feature list.
 */
export const loopStages = [
  { name: "Discover", line: "Find your level and who to play." },
  { name: "Play", line: "Turn it into a real fixture." },
  { name: "Compete", line: "Seasons, standings, a rating." },
  { name: "Improve", line: "Know what to practise next." },
  { name: "Connect", line: "Stay in your tennis community." },
] as const;

export const chapters: Chapter[] = [
  {
    id: "discover",
    label: "Chapter 1",
    title: "Discover",
    stages: ["Discover"],
    tagline: "Find your level. Find your people.",
    intro:
      "A short, honest assessment places you on a 1.0–7.0 scale. Discovery then stays beginner-safe by only introducing you to players you can actually rally with.",
    items: [
      {
        title: "Adaptive assessment",
        body: "Thirteen questions estimate your level and skill breakdown. Disagree with the result? Adjust it. The app meets you where you are.",
        badge: { text: "At onboarding", tone: "badge-primary" },
      },
      {
        title: "Player discovery",
        body: "Filter players by level, distance, format and availability. Exact locations and contact details never leave the server. Distance shows as a coarse band, like “~3 km away”.",
        badge: { text: "Privacy-first", tone: "badge-success" },
      },
      {
        title: "Courts & clubs nearby",
        body: "Surface, indoor/outdoor, lighting, booking type, and honest blanks where a venue hasn't been verified, never an invented phone number.",
        badge: { text: "Court finder", tone: "badge-primary" },
      },
    ],
  },
  {
    id: "compete",
    label: "Chapter 2",
    title: "Play & Compete",
    stages: ["Play", "Compete"],
    tagline: "From “fancy a game?” to a fixture.",
    intro:
      "Scheduling is structured, not a chat maze. Propose times, counter, settle on a court. The match only leaves PROPOSED when everyone is actually in.",
    items: [
      {
        title: "Structured challenges",
        body: "Challenge a connected player, propose time options, suggest a court, counter up to three rounds. Then the app points you at the conversation, not another week of back-and-forth.",
        badge: { text: "Time proposals", tone: "badge-primary" },
      },
      {
        title: "Doubles, properly",
        body: "You name your partner up front, your opponent nominates theirs on accept. The fixture is real when all four players have accepted.",
        badge: { text: "Four-player flow", tone: "badge-primary" },
      },
      {
        title: "Results both players trust",
        body: "One player enters the score, the other confirms or disputes. Both versions are kept until they match, so ratings stay clean without an argument.",
        badge: { text: "Confirm or dispute", tone: "badge-success" },
      },
    ],
    coda: {
      name: "Compete",
      tagline: "Standings that mean something.",
      intro:
        "Real leagues: registration windows, waitlists, automatic round-robin pairing, fixtures, and standings snapshots that remember your movement week to week.",
      items: [
        {
          title: "Leagues with real seasons",
          body: "Register (or queue), get your fixtures when the round opens, play them through the same scheduling and results flow as any match.",
          badge: { text: "Seasons & rounds", tone: "badge-primary" },
        },
        {
          title: "A rating you can trust",
          body: "An Elo-style engine on the same 1.0–7.0 scale as your profile, so every number in the app is one comparable unit. Walkovers and retirements are handled by rule, not by argument.",
          badge: { text: "1.0 – 7.0", tone: "badge-primary" },
        },
        {
          title: "Standings with history",
          body: "Round-closed standings snapshots, so the movement arrow next to your name is earned, not decorative.",
          badge: { text: "Movement arrows", tone: "badge-success" },
        },
      ],
    },
  },
  {
    id: "improve",
    label: "Chapter 3",
    title: "Improve & Connect",
    stages: ["Improve", "Connect"],
    tagline: "Know what to practise on Tuesday.",
    intro:
      "Your rating says how you compete; your skill profile says why. Drift keeps both, and points your practice at the weakest one.",
    items: [
      {
        title: "A real skill profile",
        body: "Serve, forehand, backhand, return, net, movement and match play, blended from your assessment baseline and logged practice, never a guess dressed as a percentage.",
        badge: { text: "Seven pillars", tone: "badge-primary" },
      },
      {
        title: "Lessons, drills, plans",
        body: "Recommendations matched to your level and weakest skill, plus training plans that sequence them into something you can actually follow.",
        badge: { text: "Learning centre", tone: "badge-primary" },
      },
      {
        title: "Goals with honest progress",
        body: "Set a target, get milestones, and a status that compares your real pace to the plan: ON TRACK or BEHIND, not a pat on the head.",
        badge: { text: "Milestones", tone: "badge-success" },
      },
    ],
    coda: {
      name: "Connect",
      tagline: "Your tennis life, in one place.",
      intro:
        "Connections, messages, club announcements and tennis news, with the official channel kept separate from the group-chat noise.",
      items: [
        {
          title: "Messaging that stays in context",
          body: "Every match gets its own thread, and every state change (proposed, accepted, disputed) lands in it as a system message you can scroll back to.",
          badge: { text: "Match threads", tone: "badge-primary" },
        },
        {
          title: "Clubs & announcements",
          body: "Follow your club's feed and keep official announcements apart from casual chat, so “rained off” doesn't drown out “round starts Monday”.",
          badge: { text: "Club feed", tone: "badge-primary" },
        },
        {
          title: "Tennis news, categorised",
          body: "Pro, players, tournaments, local, Africa, clubs and community, summarised and attributed, with a link to the original story.",
          badge: { text: "News feed", tone: "badge-neutral" },
        },
      ],
    },
  },
];

/**
 * Padel, promoted from a one-card aside to a section of its own (2026-09-08).
 *
 * The order still matters: tennis leads the page and keeps the name. But
 * padel is no longer framed as a coming-soon note, and every claim below is
 * shipped and checkable. `MatchSport` is TENNIS | PADEL and scopes Match,
 * League, Tournament, Ladder, CourtGroup, Club and LearningContent;
 * club-admin's league and ladder forms both expose the sport picker (its
 * league list even renders a padel icon); PadelProfile and
 * PadelAssessmentSession carry the separate assessment and rating.
 */
export const padel = {
  eyebrow: "Second sport · My Sports",
  title: "Padel, as a real second sport",
  body: "Add padel from your profile and it runs on the same rails as your tennis, with its own assessment, its own rating and its own match history, kept fully separate from your tennis record. Tennis leads here and keeps the name; padel is not a token.",
  points: [
    "A padel assessment and rating of its own, independent of your tennis level",
    "Padel leagues and ladders, created by clubs the same way as tennis ones",
    "Courts, clubs, coaches and lessons tagged by sport, so nothing bleeds across",
    "One profile, two records, and you opt in only when you want the second",
  ],
};

export const standings = {
  title: "Your season, at a glance",
  note: "Illustrative data. This is what a live standings table looks like in the app.",
  columns: ["#", "Player", "P", "W", "L", "Rating", "Form"],
  rows: [
    { pos: 1, player: "Sarah W.", p: 6, w: 5, l: 1, rating: 4.2, form: "W W W L W" },
    { pos: 2, player: "Kevin M.", p: 6, w: 4, l: 2, rating: 3.8, form: "W L W W L" },
    { pos: 3, player: "Emma O.", p: 6, w: 2, l: 4, rating: 2.4, form: "L W L L W" },
    { pos: 4, player: "Daniel K.", p: 6, w: 1, l: 5, rating: 2.1, form: "L L W L L" },
  ],
};

export const clubs = {
  title: "Run your club without the spreadsheet",
  body: "Club admins get their own console: create leagues and seasons, let Drift generate the fixtures, settle disputes from a real queue, keep members and announcements in one place, and keep your courts visible to every player nearby.",
  points: [
    "League, season, fixture and dispute management",
    "Members, roles, invitations and moderation",
    "Court listings and verification",
    "Club subscriptions billed in KES through IntaSend",
  ],
  cta: { text: "Talk to us", href: "mailto:drift@einsbrand.com" },
};

/**
 * Waitlist copy. No counts, no "spots remaining", no countdown — DESIGN.md
 * rule 4 forbids scarcity and PRODUCT.md forbids numbers that do not exist.
 * The offer is clear: launch news first, then occasional internal Drift
 * Tennis product updates and offers. See the public Privacy Policy.
 */
export const waitlist = {
  eyebrow: "Before the first serve",
  title: "Be there for round one",
  body: "Drift Tennis launches on Android first, with iOS to follow, and it is free to join and free to play while we get going. Tennis leads, padel is there too. Leave your name and email and we'll send launch news, internal product updates and the occasional Drift Tennis offer. You can opt out of non-essential emails whenever you want.",
  /**
   * "Free at launch" is a real commitment, not a promotion: PRODUCT.md's
   * launch posture is app users free, clubs paying via IntaSend. Worded as
   * "while we get going" rather than "free forever", which nobody has decided.
   */
  note: "We do not sell or share your email for another business’s marketing.",
  audiences: [
    { value: "PLAYER", label: "A player", hint: "I want to play more tennis or padel" },
    { value: "CLUB", label: "A club or coach", hint: "I run competitions or teach" },
  ],
  /** Launch markets lead the list, with a clear catch-all for everyone else. */
  countries: [
    { value: "", label: "Select country" },
    { value: "Kenya", label: "Kenya" },
    { value: "Uganda", label: "Uganda" },
    { value: "Tanzania", label: "Tanzania" },
    { value: "Rwanda", label: "Rwanda" },
    { value: "Ethiopia", label: "Ethiopia" },
    { value: "Nigeria", label: "Nigeria" },
    { value: "Ghana", label: "Ghana" },
    { value: "South Africa", label: "South Africa" },
    { value: "Zambia", label: "Zambia" },
    { value: "Zimbabwe", label: "Zimbabwe" },
    { value: "United Kingdom", label: "United Kingdom" },
    { value: "United States", label: "United States" },
    { value: "Other", label: "Other" },
  ],
  /** Mirrors the app's real 1.0–7.0 assessment scale — no invented tiers. */
  levels: [
    { value: "", label: "Prefer not to say" },
    { value: "1.0-2.0", label: "Just starting (1.0 – 2.0)" },
    { value: "2.5-3.5", label: "Improving (2.5 – 3.5)" },
    { value: "4.0-5.0", label: "Solid club player (4.0 – 5.0)" },
    { value: "5.5-7.0", label: "Competitive (5.5 – 7.0)" },
    { value: "unsure", label: "Not sure yet" },
  ],
  success: {
    title: "You're on the list.",
    body: "We’ll send launch news first, then occasional internal product updates and offers. You can opt out of non-essential emails at any time.",
  },
};

export const footer = {
  supportEmail: "drift@einsbrand.com",
};

export const legalLinks = [
  { href: "/terms", label: "Terms and Conditions", shortLabel: "Terms" },
  { href: "/privacy-policy", label: "Privacy Policy", shortLabel: "Privacy" },
  { href: "/data-privacy", label: "Data Privacy Notice", shortLabel: "Data Privacy" },
] as const;
