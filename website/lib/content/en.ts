import type { Dictionary } from "./types";

/**
 * English copy — the source of truth. Every line here is the existing
 * landing-page copy (see `content.ts`'s history and PRODUCT.md's
 * never-fabricate rule), restructured under locale keys. French and Spanish
 * mirror this shape exactly.
 */
export const en: Dictionary = {
  locale: "en",
  meta: {
    title: "Drift Tennis · Find tennis players, play real leagues",
    description:
      "Find tennis and padel opponents at your level, agree the match, confirm results together and build a rating you can trust. Free to join. Android first.",
  },
  header: {
    sectionsAria: "Sections",
    padel: "Padel",
    forClubs: "For clubs",
    legal: "Legal",
    joinCta: "Join the waitlist",
    backToSite: "← Back to the site",
  },
  hero: {
    quotePrefix: "“I should play more ",
    wordTennis: "tennis.",
    wordPadel: "padel.",
    quoteSuffix: "”",
    strikeAria: "I should play more tennis or padel.",
    resolve: "You have a match on Saturday.",
    body: "Built for racket sports, Drift Tennis finds you opponents at your level, schedules the match, records the result both players confirm, and turns your season into a rating you can trust. Tennis leads, padel runs on the same rails, and both live in one app instead of a booking site, three WhatsApp groups and a spreadsheet ladder.",
    ctaPrimary: "Join the waitlist",
    ctaSecondary: "How a season works ↓",
    freeNote: "Free to join while we get going. Android first, iOS follows.",
  },
  loopStrip: {
    heading: "One loop, five stages, and you re-enter it every week",
    stages: [
      { name: "Discover", line: "Find your level and who to play." },
      { name: "Play", line: "Turn it into a real fixture." },
      { name: "Compete", line: "Seasons, standings, a rating." },
      { name: "Improve", line: "Know what to practise next." },
      { name: "Connect", line: "Stay in your tennis community." },
    ],
  },
  chapters: [
    {
      id: "discover",
      numeral: "1",
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
      numeral: "2",
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
      numeral: "3",
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
  ],
  padel: {
    eyebrow: "Second sport · My Sports",
    title: "Padel, as a real second sport",
    body: "Add padel from your profile and it runs on the same rails as your tennis, with its own assessment, its own rating and its own match history, kept fully separate from your tennis record. Tennis leads here and keeps the name; padel is not a token.",
    points: [
      "A padel assessment and rating of its own, independent of your tennis level",
      "Padel leagues and ladders, created by clubs the same way as tennis ones",
      "Courts, clubs, coaches and lessons tagged by sport, so nothing bleeds across",
      "One profile, two records, and you opt in only when you want the second",
    ],
  },
  standings: {
    badge: "Full time",
    title: "Your season, at a glance",
    bullets: [
      "· Automatic round-robin fixtures per season",
      "· Opponent-confirmed results, disputes kept until settled",
      "· Standings snapshots with movement week to week",
    ],
    cardTitle: "Saturday League · Standings",
    cardBadge: "After Round 6",
    columns: ["#", "Player", "P", "W", "L", "Rating", "Form"],
    note: "Illustrative data. This is what a live standings table looks like in the app.",
  },
  clubs: {
    badge: "For clubs & academies",
    title: "Run your club without the spreadsheet",
    body: "Club admins get their own console: create leagues and seasons, let Drift generate the fixtures, settle disputes from a real queue, keep members and announcements in one place, and keep your courts visible to every player nearby.",
    points: [
      "League, season, fixture and dispute management",
      "Members, roles, invitations and moderation",
      "Court listings and verification",
      "Club subscriptions billed in KES through IntaSend",
    ],
    cta: "Talk to us",
  },
  final: {
    badge: "The final",
    title: "Your season starts with one match",
    body: "Sign up, take the assessment, and Drift does the rest: opponents at your level, the fixture on your calendar, and a rating that moves only when results are confirmed.",
    cta: "Join the waitlist",
    note: "Free to join while we get going. Android first, iOS follows. The app stores are not live yet, so the waitlist is how you hear about it first.",
  },
  appScreens: {
    illustrative: "Illustrative app screens, not real player data.",
    fixture: {
      badge: "Up next · Round 3",
      format: "Doubles",
      rating: "Rating",
      date: "Sat · 16:00",
      accepted: "✓ Time accepted",
      footnote: "Club court suggested · 2 of 3 proposals settled",
    },
    challenge: {
      badge: "Incoming challenge",
      line: "{name} challenged you",
      proposed: "Proposed: Sun 10:00 or 17:00",
      accept: "Accept",
      proposeTime: "Propose time",
    },
    skill: {
      title: "Skill profile",
      ratingBadge: "Rating 3.5",
      pillars: {
        serve: "Serve",
        forehand: "Forehand",
        backhand: "Backhand",
        return: "Return",
        net: "Net",
        movement: "Movement",
        matchPlay: "Match play",
      },
      practiseTitle: "Practise next: backhand",
      practiseBody: "3 drills matched to your level",
    },
  },
  footer: {
    tagline: "Find your match. Play your season.",
    product: "Product",
    legal: "Legal",
    contact: "Contact",
    theLoop: "The loop",
    forClubs: "For clubs",
    join: "Join the waitlist",
    productAria: "Footer product links",
    legalAria: "Footer legal links",
    copyright: "Copyright {year} Drift Tennis.",
  },
  waitlist: {
    eyebrow: "Before the first serve",
    title: "Be there for round one",
    body: "Drift Tennis launches on Android first, with iOS to follow, and it is free to join and free to play while we get going. Tennis leads, padel is there too. Leave your name and email and we'll send launch news, internal product updates and the occasional Drift Tennis offer. You can opt out of non-essential emails whenever you want.",
    metaDescription: "Join the Drift Tennis waitlist and we’ll email you at launch. Free to join, Android first and iOS to follow. Tennis leads, padel is there too.",
    note: "We do not sell or share your email for another business’s marketing.",
    audiences: [
      { value: "PLAYER", label: "A player", hint: "I want to play more tennis or padel" },
      { value: "CLUB", label: "A club or coach", hint: "I run competitions or teach" },
    ],
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
      personalTitle: "You're on the list, {name}.",
      body: "We’ll send launch news first, then occasional internal product updates and offers. You can opt out of non-essential emails at any time.",
    },
    form: {
      firstName: "First name",
      firstNamePlaceholder: "Sarah",
      email: "Email address",
      legend: "I'm…",
      country: "Country",
      optional: "(optional)",
      selectCountry: "Select country",
      city: "City",
      cityPlaceholder: "Your city",
      level: "Level",
      errorFirstName: "Tell us your first name so we know what to call you.",
      errorEmail: "Enter an email address we can reach you at.",
      errorGeneric: "That didn't go through.",
      submitting: "Adding you…",
      submit: "Join the waitlist",
      badge: "On the list",
      privacyLink: "Privacy Policy",
    },
  },
};
