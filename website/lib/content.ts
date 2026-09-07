/**
 * All landing-page copy in one place.
 *
 * Rule: never fabricate. Every capability named here exists in the shipped
 * product (see PRODUCT.md "Capabilities and Constraints"). Fixtures,
 * standings rows and app screens shown on the page are illustrative and
 * labelled as such. Store links do not exist yet (Play submission in
 * progress) — the download CTA is honest about that.
 */

export const rounds = [
  {
    id: "round-1",
    label: "Round 1",
    name: "Discover",
    tagline: "Find your level. Find your people.",
    intro:
      "A short, honest assessment places you on a 1.0–7.0 scale — then discovery stays beginner-safe by only introducing you to players you can actually rally with.",
    fixtures: [
      {
        title: "Adaptive assessment",
        body: "Thirteen questions estimate your level and skill breakdown. Disagree with the result? Adjust it — the app meets you where you are.",
        badge: { text: "At onboarding", tone: "badge-primary" },
      },
      {
        title: "Player discovery",
        body: "Filter players by level, distance, format and availability. Exact locations and contact details never leave the server — distance shows as a coarse band, like “~3 km away”.",
        badge: { text: "Privacy-first", tone: "badge-success" },
      },
      {
        title: "Courts & clubs nearby",
        body: "Surface, indoor/outdoor, lighting, booking type — and honest blanks where a venue hasn't been verified, never an invented phone number.",
        badge: { text: "Court finder", tone: "badge-primary" },
      },
    ],
  },
  {
    id: "round-2",
    label: "Round 2",
    name: "Play",
    tagline: "From “fancy a game?” to a fixture.",
    intro:
      "Scheduling is structured, not a chat maze. Propose times, counter, settle on a court — and the match only leaves PROPOSED when everyone is actually in.",
    fixtures: [
      {
        title: "Structured challenges",
        body: "Challenge a connected player, propose time options, suggest a court, counter up to three rounds — then the app points you at the conversation, not another week of back-and-forth.",
        badge: { text: "Time proposals", tone: "badge-primary" },
      },
      {
        title: "Doubles, properly",
        body: "You name your partner up front, your opponent nominates theirs on accept. The fixture is real when all four players have accepted.",
        badge: { text: "Four-player flow", tone: "badge-primary" },
      },
      {
        title: "Results both players trust",
        body: "One player enters the score, the other confirms — or disputes. Both versions are kept until they match, so ratings stay clean without an argument.",
        badge: { text: "Confirm or dispute", tone: "badge-success" },
      },
    ],
  },
  {
    id: "round-3",
    label: "Round 3",
    name: "Compete",
    tagline: "Standings that mean something.",
    intro:
      "Real leagues: registration windows, waitlists, automatic round-robin pairing, fixtures, and standings snapshots that remember your movement week to week.",
    fixtures: [
      {
        title: "Leagues with real seasons",
        body: "Register (or queue), get your fixtures when the round opens, play them through the same scheduling and results flow as any match.",
        badge: { text: "Seasons & rounds", tone: "badge-primary" },
      },
      {
        title: "A rating you can trust",
        body: "An Elo-style engine on the same 1.0–7.0 scale as your profile — every number in the app is one comparable unit. Walkovers and retirements are handled by rule, not by argument.",
        badge: { text: "1.0 – 7.0", tone: "badge-primary" },
      },
      {
        title: "Standings with history",
        body: "Round-closed standings snapshots, so the movement arrow next to your name is earned, not decorative.",
        badge: { text: "Movement arrows", tone: "badge-success" },
      },
    ],
  },
  {
    id: "round-4",
    label: "Round 4",
    name: "Improve",
    tagline: "Know what to practise on Tuesday.",
    intro:
      "Your rating says how you compete; your skill profile says why. Drift keeps both, and points your practice at the weakest one.",
    fixtures: [
      {
        title: "A real skill profile",
        body: "Serve, forehand, backhand, return, net, movement, match play — blended from your assessment baseline and logged practice, never a guess dressed as a percentage.",
        badge: { text: "Seven pillars", tone: "badge-primary" },
      },
      {
        title: "Lessons, drills, plans",
        body: "Recommendations matched to your level and weakest skill, plus training plans that sequence them into something you can actually follow.",
        badge: { text: "Learning centre", tone: "badge-primary" },
      },
      {
        title: "Goals with honest progress",
        body: "Set a target, get milestones, and a status that compares your real pace to the plan — ON TRACK or BEHIND, not a pat on the head.",
        badge: { text: "Milestones", tone: "badge-success" },
      },
    ],
  },
  {
    id: "round-5",
    label: "Round 5",
    name: "Connect",
    tagline: "Your tennis life, in one place.",
    intro:
      "Connections, messages, club announcements and tennis news — with the official channel kept separate from the group-chat noise.",
    fixtures: [
      {
        title: "Messaging that stays in context",
        body: "Every match gets its own thread, and every state change — proposed, accepted, disputed — lands in it as a system message you can scroll back to.",
        badge: { text: "Match threads", tone: "badge-primary" },
      },
      {
        title: "Clubs & announcements",
        body: "Follow your club's feed and keep official announcements apart from casual chat, so “rained off” doesn't drown out “round starts Monday”.",
        badge: { text: "Club feed", tone: "badge-primary" },
      },
      {
        title: "Tennis news, categorised",
        body: "Pro, players, tournaments, local, Africa, clubs, community — summarised and attributed, with a link to the original story.",
        badge: { text: "News feed", tone: "badge-neutral" },
      },
    ],
  },
] as const;

export const padelAside = {
  title: "And when you're ready: padel",
  body: "Add padel from your profile — its own assessment, its own rating, its own match history, fully independent from your tennis record. Tennis stays front and centre; padel is a genuine second sport, not a token.",
};

export const standings = {
  title: "Your season, at a glance",
  note: "Illustrative data — this is what a live standings table looks like in the app.",
  columns: ["#", "Player", "P", "W", "L", "Rating", "Form"],
  rows: [
    { pos: 1, player: "Njeri W.", p: 6, w: 5, l: 1, rating: 4.2, form: "W W W L W" },
    { pos: 2, player: "Kevin M.", p: 6, w: 4, l: 2, rating: 3.8, form: "W L W W L" },
    { pos: 3, player: "Amara O.", p: 6, w: 2, l: 4, rating: 2.4, form: "L W L L W" },
    { pos: 4, player: "Otieno K.", p: 6, w: 1, l: 5, rating: 2.1, form: "L L W L L" },
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

export const footer = {
  supportEmail: "drift@einsbrand.com",
};
