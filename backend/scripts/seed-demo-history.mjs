/**
 * Demo accounts with three months of backdated history.
 *
 * Creates (or rebuilds) a demo PLAYER and a demo CLUB OWNER, a demo club, and
 * ~60 supporting people, with matches, ratings, leagues, events, posts,
 * billing etc. spread over the last 90 days — written straight to Postgres
 * with backdated timestamps, because the real APIs can only stamp "now".
 *
 * Isolation: every demo user and the demo club carry `isDemo = true`, and the
 * discovery surfaces (see backend/src/common/demo-scope.ts) hide them from
 * real users and hide real users from them. The Phase-A migration
 * `20260918120000_demo_flags` MUST be applied before this runs.
 *
 * Rebuild semantics: each run first deletes every `isDemo` row, then rebuilds
 * relative to *today*, so re-running before a demo also refreshes "upcoming"
 * and "recent" items. `--reset` deletes without rebuilding.
 *
 * Usage (from backend/):
 *   node scripts/seed-demo-history.mjs              # local DB
 *   node scripts/seed-demo-history.mjs --reset      # remove all demo data
 *   node scripts/seed-demo-history.mjs --allow-remote   # non-local DATABASE_URL
 *
 * Passwords come from DEMO_PLAYER_PASSWORD / DEMO_OWNER_PASSWORD; if unset a
 * random one is generated and printed once. Nothing is committed.
 *
 * Deliberately NOT created: PrivacyRequest rows (30-day erasure cron), any
 * Paddle/IntaSend billing reference (a later downgrade would hit the live
 * provider), users with a real-looking email domain (nothing is ever mailed).
 */
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';

// ------------------------------------------------------------------ guards

const args = new Set(process.argv.slice(2));
const RESET_ONLY = args.has('--reset');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (backend/.env).');
  process.exit(1);
}
const dbHost = new URL(process.env.DATABASE_URL).hostname;
const isLocalDb = ['localhost', '127.0.0.1', '::1'].includes(dbHost);
if (!isLocalDb && !args.has('--allow-remote')) {
  console.error(
    `Refusing to touch non-local database host "${dbHost}" without --allow-remote.`,
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const log = (m) => console.log(`[demo] ${m}`);

// ----------------------------------------------------------------- helpers

const NOW = new Date();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const WINDOW_START = new Date(NOW.getTime() - 90 * DAY);

/** A UTC time `days` from now (negative = past) at a given hour. */
const at = (days, hour = 18, minute = 0) => {
  const d = new Date(NOW.getTime() + days * DAY);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
};
const plus = (date, ms) => new Date(date.getTime() + ms);
const clampStart = (d) => (d < WINDOW_START ? new Date(WINDOW_START) : d);

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260918);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

async function insert(model, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    await prisma[model].createMany({ data: rows.slice(i, i + 500) });
  }
  return rows.length;
}

// -------------------------------------------------- rating (mirrors backend)
// backend/src/matches/rating.ts — same constants, same formula.
const RATING_DIVISOR = 2.0;
const RATING_K = 0.4;
const expectedScore = (ra, rb) => 1 / (1 + 10 ** ((rb - ra) / RATING_DIVISOR));
function applyResult(ra, rb, scoreA) {
  const dA = RATING_K * (scoreA - expectedScore(ra, rb));
  const nA = clamp(ra + dA, 1, 7);
  const nB = clamp(rb - dA, 1, 7);
  return { nA, nB, deltaA: nA - ra, deltaB: nB - rb };
}

// -------------------------------------------------------------------- PNGs

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** A w×h RGB PNG; `rgb(x, y)` returns [r, g, b]. */
function makePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = rgb(x, y);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- reset

async function resetDemo() {
  const clubs = await prisma.club.findMany({
    where: { isDemo: true },
    select: { id: true },
  });
  const clubIds = clubs.map((c) => c.id);
  const users = await prisma.user.findMany({
    where: { isDemo: true },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  log(`reset: ${clubIds.length} demo club(s), ${userIds.length} demo user(s)`);

  if (clubIds.length) {
    // Billing rows first (invoices/transactions hang off the account).
    const accounts = await prisma.billingAccount.findMany({
      where: { clubId: { in: clubIds } },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length) {
      const w = { billingAccountId: { in: accountIds } };
      await prisma.paymentTransaction.deleteMany({ where: w });
      await prisma.billingInvoice.deleteMany({ where: w });
      await prisma.paymentMethod.deleteMany({ where: w });
      await prisma.billingSubscription.deleteMany({ where: w });
      await prisma.billingAccount.deleteMany({ where: { id: { in: accountIds } } });
    }
    // Court.clubId is SetNull, so deleting the club would orphan its courts
    // as public independent venues. Remove them explicitly.
    await prisma.courtInquiry.deleteMany({ where: { clubId: { in: clubIds } } });
    await prisma.court.deleteMany({ where: { clubId: { in: clubIds } } });
    // Everything else (memberships, events, leagues, tournaments, ladders,
    // posts, audit log, media…) cascades from the club.
    await prisma.club.deleteMany({ where: { id: { in: clubIds } } });
  }
  if (userIds.length) {
    // Matches cascade from their creator; participants/results/threads/
    // notifications/profiles cascade from the users.
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

// -------------------------------------------------------------------- data

const FIRST = [
  'Liam', 'Noah', 'Oliver', 'Ethan', 'Lucas', 'Mason', 'Leo', 'Henry', 'Jack', 'Theo',
  'Amara', 'Sofia', 'Chloe', 'Maya', 'Zara', 'Isla', 'Nora', 'Priya', 'Elena', 'Ruby',
  'Kwame', 'Tariq', 'Mateo', 'Hiro', 'Andre', 'Farah', 'Imani', 'Luca', 'Nadia', 'Owen',
  'Yara', 'Felix', 'Grace', 'Hugo', 'Ivy', 'Jonas', 'Kira', 'Marcus', 'Nia', 'Rafael',
];
const LAST = [
  'Okafor', 'Bennett', 'Rossi', 'Nakamura', 'Fischer', 'Adeyemi', 'Hughes', 'Moreau', 'Patel', 'Kowalski',
  'Santos', 'Lindqvist', 'Haddad', 'Osei', 'Brennan', 'Tanaka', 'Duarte', 'Novak', 'Whitfield', 'Mbeki',
  'Costa', 'Ivanov', 'Abara', 'Lindgren', 'Sharma', 'Delgado', 'Frost', 'Nwosu', 'Kessler', 'Amari',
  'Voss', 'Barros', 'Chen', 'Dubois', 'Egwu', 'Fontaine', 'Gallagher', 'Hassan', 'Ibarra', 'Jansen',
];
const DOMAIN = 'demo.driftsports.app';

const CLUB_LAT = 51.465;
const CLUB_LNG = -0.142;
const jitter = (n, spread) => n + (rand() - 0.5) * spread;

const PILLARS = ['FOREHAND', 'BACKHAND', 'SERVE', 'RETURN', 'NET_PLAY', 'MOVEMENT', 'MATCH_PLAY'];
const DRILL_FOR = {
  FOREHAND: 'seed-learning-forehand-crosscourt-drill',
  BACKHAND: 'seed-learning-backhand-consistency-drill',
  SERVE: 'seed-learning-serve-placement-drill',
  RETURN: 'seed-learning-return-positioning-drill',
  NET_PLAY: 'seed-learning-volley-reaction-drill',
  MOVEMENT: 'seed-learning-split-step-drill',
  MATCH_PLAY: null,
};

const CHAT_OPENERS = [
  'Up for a hit this week?',
  'Fancy a match? I’m free most evenings.',
  'Been looking for someone at my level — game on?',
  'Saw you’re at the club too. Want to play a set or three?',
];
const CHAT_REPLIES = [
  'Sounds good — evenings work best for me.',
  'Yes! Saturday morning?',
  'Count me in. Which court?',
  'Perfect, see you there.',
];
const CHAT_LOGISTICS = [
  'I’ll book us a floodlit court.',
  'Bringing new balls.',
  'Court 2 is free at 7 — grab it?',
  'Can we push it back 30 mins? Traffic.',
];

// ------------------------------------------------------------------- build

async function build() {
  const playerPassword =
    process.env.DEMO_PLAYER_PASSWORD ?? `Drift-${randomBytes(6).toString('hex')}!`;
  const ownerPassword =
    process.env.DEMO_OWNER_PASSWORD ?? `Drift-${randomBytes(6).toString('hex')}!`;
  const playerHash = await bcrypt.hash(playerPassword, 10);
  const ownerHash = await bcrypt.hash(ownerPassword, 10);

  // ---------- people ----------
  const demoPlayer = {
    id: randomUUID(),
    profileId: randomUUID(),
    email: `demo.player@${DOMAIN}`,
    firstName: 'Jamie',
    lastName: 'Carter',
    level: 3.8,
    createdAt: at(-91, 10),
  };
  const owner = {
    id: randomUUID(),
    profileId: randomUUID(),
    email: `demo.owner@${DOMAIN}`,
    firstName: 'Morgan',
    lastName: 'Ellis',
    level: 4.5,
    createdAt: at(-91, 9),
  };

  const usedNames = new Set();
  const cast = [];
  for (let i = 0; i < 60; i++) {
    let first = FIRST[i % FIRST.length];
    // The +11 per lap keeps first/last pairs unique past the 40-name cycle.
    let last = LAST[(i * 7 + 3 + Math.floor(i / FIRST.length) * 11) % LAST.length];
    let key = `${first}.${last}`.toLowerCase();
    let n = 2;
    while (usedNames.has(key)) {
      key = `${first}.${last}${n++}`.toLowerCase();
    }
    usedNames.add(key);
    // Early joiners first: the league regulars (0-15) joined in the opening
    // weeks; the rest skew toward recent (growth curve).
    const joinDay = i < 16 ? -88 + i * 1.6 : -88 + 86 * rand() ** 0.6;
    cast.push({
      id: randomUUID(),
      profileId: randomUUID(),
      email: `${key}@${DOMAIN}`,
      firstName: first,
      lastName: last,
      level: round1(2.5 + rand() * 3),
      joinDay,
      createdAt: at(joinDay - 1, int(8, 20), int(0, 59)),
      lat: jitter(CLUB_LAT, 0.06),
      lng: jitter(CLUB_LNG, 0.08),
    });
  }
  // The 4 newest "pending" applicants joined in the last few days.
  for (const i of [54, 55, 56, 57]) {
    cast[i].joinDay = -int(1, 6);
    cast[i].createdAt = at(cast[i].joinDay - 1, 12);
  }
  const P = (i) => cast[i]; // shorthand

  // ---------- courts / club ids ----------
  const clubId = randomUUID();
  const mainCourtId = randomUUID();
  const indoorCourtId = randomUUID();
  const padelCourtId = randomUUID();
  const courtIds = [mainCourtId, indoorCourtId, padelCourtId];
  const CLUB_NAME = 'Demo Tennis Club';
  const courtLabel = (n) => `${CLUB_NAME} – Court ${n}`;

  // ---------- strength model (drives who wins) ----------
  const strength = new Map(cast.map((c) => [c.id, c.level + (rand() - 0.5) * 0.6]));
  const demoStrengthAt = (t) => {
    const progress = clamp((t.getTime() - WINDOW_START.getTime()) / (90 * DAY), 0, 1);
    return 3.7 + 0.9 * progress;
  };
  const strengthOf = (id, t) => (id === demoPlayer.id ? demoStrengthAt(t) : strength.get(id) ?? 4);
  const sideStrength = (ids, t) => ids.reduce((s, id) => s + strengthOf(id, t), 0) / ids.length;
  const decideWinner = (aIds, bIds, t) => {
    let p = expectedScore(sideStrength(aIds, t), sideStrength(bIds, t));
    // The Elo scale here is flat (divisor 2.0), so raw strength alone gives the
    // demo player a ~50% record. Give them a "form" edge that grows over the
    // window, so the demo tells a story of steady improvement.
    const progress = clamp((t.getTime() - WINDOW_START.getTime()) / (90 * DAY), 0, 1);
    const edge = 0.08 + 0.16 * progress;
    if (aIds.includes(demoPlayer.id)) p = clamp(p + edge, 0.05, 0.95);
    else if (bIds.includes(demoPlayer.id)) p = clamp(p - edge, 0.05, 0.95);
    return rand() < p ? 'A' : 'B';
  };

  // ---------- score generation ----------
  const WIN_SETS = [[6, 0], [6, 1], [6, 2], [6, 3], [6, 3], [6, 4], [6, 4], [7, 5], [7, 6]];
  const setFor = (winner) => {
    // Games from the winner's perspective; 7-6 carries a tiebreak.
    const [w, l] = pick(WIN_SETS);
    const tb = w === 7 && l === 6 ? [7, int(3, 5)] : null;
    return { w, l, tb };
  };
  const toSet = (side, { w, l, tb }) => {
    const a = side === 'A';
    return {
      sideAGames: a ? w : l,
      sideBGames: a ? l : w,
      ...(tb ? { sideATiebreak: a ? tb[0] : tb[1], sideBTiebreak: a ? tb[1] : tb[0] } : {}),
    };
  };
  const genSets = (winner) => {
    const loser = winner === 'A' ? 'B' : 'A';
    if (rand() < 0.35) {
      // 2-1: loser takes a set.
      const order = shuffle(['w', 'w', 'l']);
      return order.map((k) => toSet(k === 'w' ? winner : loser, setFor()));
    }
    return [toSet(winner, setFor()), toSet(winner, setFor())];
  };
  const genRetirementSets = (winner) => [
    toSet(winner, { w: 6, l: int(2, 4), tb: null }),
    toSet(winner, { w: int(3, 4), l: int(0, 2), tb: null }),
  ];

  // ---------- match specs ----------
  /** @type {any[]} */
  const specs = [];
  const addSpec = (s) => {
    const spec = {
      id: randomUUID(),
      format: 'SINGLES',
      kind: 'SCORE',
      chat: false,
      courtName: null,
      courtId: null,
      fixtureOnly: false,
      ...s,
    };
    specs.push(spec);
    return spec;
  };
  const clubCourt = () => {
    const n = int(1, 6);
    return { courtName: courtLabel(n), courtId: mainCourtId };
  };
  const publicCourt = () =>
    pick([
      { courtName: 'Clapham Common Courts', courtId: null },
      { courtName: 'Battersea Park Courts', courtId: null },
    ]);

  // -- demo player's free matches (~26 singles + 4 doubles) --
  const oppPool = cast.slice(0, 20);
  let lastOpp = null;
  const freeCount = 26;
  for (let i = 0; i < freeCount; i++) {
    let day = -88 + Math.round((i * 84) / (freeCount - 1)) + int(-1, 1);
    day = clamp(day, -88, -4);
    const weekend = rand() < 0.3;
    const time = weekend ? at(day, int(9, 11)) : at(day, int(17, 20), pick([0, 30]));
    let opp;
    do {
      opp = pick(oppPool);
    } while (opp.id === lastOpp);
    lastOpp = opp.id;
    const demoIsCreator = rand() < 0.5;
    const aIds = demoIsCreator ? [demoPlayer.id] : [opp.id];
    const bIds = demoIsCreator ? [opp.id] : [demoPlayer.id];
    const spec = {
      time,
      a: aIds,
      b: bIds,
      creator: aIds[0],
      chat: true,
      ...(rand() < 0.6 ? clubCourt() : publicCourt()),
    };
    if (i === 9) spec.kind = 'WALKOVER';
    if (i === 17) spec.kind = 'RETIREMENT';
    addSpec(spec);
  }
  // doubles
  for (const day of [-62, -47, -26, -9]) {
    const partner = pick(cast.slice(0, 12));
    const [o1, o2] = shuffle(cast.slice(12, 30)).slice(0, 2);
    addSpec({
      format: 'DOUBLES',
      time: at(day, 18, 30),
      a: [demoPlayer.id, partner.id],
      b: [o1.id, o2.id],
      creator: demoPlayer.id,
      chat: true,
      ...clubCourt(),
    });
  }
  // cast-vs-cast friendlies so ratings/history exist across the club
  for (let i = 0; i < 10; i++) {
    const [x, y] = shuffle(cast.slice(0, 30)).slice(0, 2);
    addSpec({
      time: at(-int(4, 85), int(17, 20)),
      a: [x.id],
      b: [y.id],
      creator: x.id,
      ...clubCourt(),
    });
  }

  // -- special demo scenarios (open items on the player's Home/Play tabs) --
  // Incoming challenge, unanswered.
  const challenger = P(5);
  const incoming = addSpec({
    kind: 'PROPOSED',
    time: null,
    a: [challenger.id],
    b: [demoPlayer.id],
    creator: challenger.id,
    createdAt: at(-1, 15),
    expiresAt: plus(NOW, 3 * DAY),
    chat: true,
  });
  // Two upcoming scheduled matches.
  const upcoming1 = addSpec({
    kind: 'SCHEDULED',
    time: at(2, 18, 30),
    a: [demoPlayer.id],
    b: [P(2).id],
    creator: demoPlayer.id,
    createdAt: at(-3, 12),
    chat: true,
    ...clubCourt(),
  });
  const upcoming2 = addSpec({
    kind: 'SCHEDULED',
    time: at(6, 10),
    a: [P(7).id],
    b: [demoPlayer.id],
    creator: P(7).id,
    createdAt: at(-2, 19),
    chat: true,
    ...publicCourt(),
  });
  // Result waiting for the demo player to confirm.
  const pending = addSpec({
    kind: 'PENDING',
    time: at(-1, 18),
    a: [demoPlayer.id],
    b: [P(9).id],
    creator: demoPlayer.id,
    createdAt: at(-6, 12),
    winner: 'B',
    submittedByOpponent: true,
    chat: true,
    ...clubCourt(),
  });
  // Disputed result (demo player disputed it).
  const disputed = addSpec({
    kind: 'DISPUTED',
    time: at(-4, 18),
    a: [P(11).id],
    b: [demoPlayer.id],
    creator: P(11).id,
    createdAt: at(-9, 12),
    winner: 'A',
    submittedByOpponent: true,
    chat: true,
    ...clubCourt(),
  });

  // -- Leagues --
  const leagues = [];

  // League 1: completed 8-player round robin (7 weekly rounds).
  const l1Players = [demoPlayer, ...cast.slice(0, 7)];
  const l1 = {
    id: randomUUID(),
    name: 'Summer Singles League',
    players: l1Players,
    registrationOpensAt: at(-88, 9),
    registrationClosesAt: at(-80, 21),
    startsAt: at(-78, 8),
    roundCount: 7,
    intervalMin: 7 * 24 * 60,
    completedAt: at(-28, 10),
    capacity: 8,
    rounds: [],
  };
  leagues.push(l1);
  {
    const ids = l1Players.map((p) => p.id);
    const rounds = circleRounds(ids);
    rounds.forEach((pairs, idx) => {
      const index = idx + 1;
      const openedAt = plus(l1.startsAt, idx * 7 * DAY);
      const deadline = plus(l1.startsAt, index * 7 * DAY);
      const round = { id: randomUUID(), index, openedAt, deadline, closedAt: plus(deadline, 2 * HOUR), fixtures: [] };
      pairs.forEach(([a, b], pi) => {
        let kind = 'SCORE';
        const involvesDemo = a === demoPlayer.id || b === demoPlayer.id;
        if (!involvesDemo && index === 3 && pi === 2) kind = 'WALKOVER';
        if (!involvesDemo && index === 5 && pi === 1) kind = 'RETIREMENT';
        const time = plus(openedAt, int(1, 5) * DAY + int(17, 20) * HOUR - openedAt.getUTCHours() * HOUR);
        const spec = addSpec({
          kind,
          time,
          a: [a],
          b: [b],
          creator: a,
          createdAt: openedAt,
          chat: involvesDemo,
          fixtureOnly: true,
          ...clubCourt(),
        });
        round.fixtures.push({ id: randomUUID(), sideA: a, sideB: b, matchId: spec.id, specRef: spec });
      });
      l1.rounds.push(round);
    });
  }

  // League 2: live 6-player league, only round 1 open (30-day rounds, so
  // the seed doesn't go stale within the demo window).
  const l2Players = [demoPlayer, P(2), P(4), P(5), P(6), P(8)];
  const l2 = {
    id: randomUUID(),
    name: 'Autumn Singles League',
    players: l2Players,
    registrationOpensAt: at(-20, 9),
    registrationClosesAt: at(-11, 21),
    startsAt: at(-10, 8),
    roundCount: 5,
    intervalMin: 30 * 24 * 60,
    completedAt: null,
    capacity: 8,
    rounds: [],
  };
  leagues.push(l2);
  {
    // Circle-method round 1 pairs (p0,p5) (p1,p4) (p2,p3), so order the
    // players to land the scenarios we want on round 1:
    //   demo vs P(2)  -> completed & confirmed
    //   P(4) vs P(5)  -> disputed (shows in Club Admin's dispute queue)
    //   P(6) vs P(8)  -> scheduled, upcoming
    const order = [demoPlayer.id, P(4).id, P(6).id, P(8).id, P(5).id, P(2).id];
    const rounds = circleRounds(order);
    rounds.forEach((pairs, idx) => {
      const index = idx + 1;
      const round = {
        id: randomUUID(),
        index,
        openedAt: index === 1 ? l2.startsAt : null,
        deadline: plus(l2.startsAt, index * 30 * DAY),
        closedAt: null,
        fixtures: [],
      };
      pairs.forEach(([a, b], pi) => {
        let matchId = null;
        let specRef = null;
        if (index === 1) {
          const base = { a: [a], b: [b], creator: a, createdAt: l2.startsAt, fixtureOnly: true, ...clubCourt() };
          if (a === demoPlayer.id || b === demoPlayer.id) {
            specRef = addSpec({ ...base, kind: 'SCORE', time: at(-6, 18, 30), chat: true });
          } else if ((a === P(4).id && b === P(5).id) || (a === P(5).id && b === P(4).id)) {
            specRef = addSpec({ ...base, kind: 'DISPUTED', time: at(-3, 19), winner: 'A', submittedByOpponent: false, chat: false });
          } else {
            specRef = addSpec({ ...base, kind: 'SCHEDULED', time: at(5, 19), chat: false });
          }
          matchId = specRef.id;
        }
        round.fixtures.push({ id: randomUUID(), sideA: a, sideB: b, matchId, specRef });
      });
      l2.rounds.push(round);
    });
  }

  // League 3: upcoming, registration open (demo player NOT enrolled, so the
  // "register" flow can be demonstrated).
  const l3 = {
    id: randomUUID(),
    name: 'Winter Doubles League',
    players: cast.slice(8, 12),
    registrationOpensAt: at(-5, 9),
    registrationClosesAt: at(12, 21),
    startsAt: at(14, 8),
    roundCount: 5,
    intervalMin: 7 * 24 * 60,
    completedAt: null,
    capacity: 12,
    format: 'DOUBLES',
    rounds: [],
  };
  leagues.push(l3);

  // ---------- resolve outcomes + replay ratings chronologically ----------
  const singles = new Map();
  const doubles = new Map();
  const startRating = (id) => {
    if (id === demoPlayer.id) return demoPlayer.level;
    return cast.find((c) => c.id === id)?.level ?? 4.0;
  };
  const getR = (map, id) => {
    if (!map.has(id)) map.set(id, startRating(id));
    return map.get(id);
  };

  for (const s of specs) {
    const decided = ['SCORE', 'RETIREMENT', 'PENDING', 'DISPUTED'].includes(s.kind);
    if (s.kind === 'WALKOVER') s.winner = null;
    else if (decided && !s.winner) s.winner = decideWinner(s.a, s.b, s.time);
    if (s.kind === 'SCORE' || s.kind === 'PENDING') s.sets = genSets(s.winner);
    if (s.kind === 'RETIREMENT') s.sets = genRetirementSets(s.winner);
    if (s.kind === 'DISPUTED') {
      s.sets = genSets(s.winner);
      s.disputantWinner = s.winner === 'A' ? 'B' : 'A';
      s.disputantSets = genSets(s.disputantWinner);
    }
    if (!s.createdAt) {
      s.createdAt = clampStart(plus(s.time, -int(2, 6) * DAY));
    }
  }
  const rated = specs
    .filter((s) => s.kind === 'SCORE' || s.kind === 'RETIREMENT')
    .sort((x, y) => x.time - y.time);
  for (const s of rated) {
    const map = s.format === 'DOUBLES' ? doubles : singles;
    const ra = s.a.reduce((t, id) => t + getR(map, id), 0) / s.a.length;
    const rb = s.b.reduce((t, id) => t + getR(map, id), 0) / s.b.length;
    const { deltaA, deltaB } = applyResult(ra, rb, s.winner === 'A' ? 1 : 0);
    s.deltaA = deltaA;
    s.deltaB = deltaB;
    for (const id of s.a) map.set(id, clamp(getR(map, id) + deltaA, 1, 7));
    for (const id of s.b) map.set(id, clamp(getR(map, id) + deltaB, 1, 7));
  }

  // ---------- emit users / profiles ----------
  const userRows = [];
  const profileRows = [];
  const slotRows = [];
  const assessRows = [];
  const allPeople = [demoPlayer, owner, ...cast];
  for (const p of allPeople) {
    const isDemoPlayer = p.id === demoPlayer.id;
    const isOwner = p.id === owner.id;
    userRows.push({
      id: p.id,
      email: p.email,
      passwordHash: isDemoPlayer ? playerHash : isOwner ? ownerHash : null,
      firstName: p.firstName,
      lastName: p.lastName,
      bio: isDemoPlayer
        ? 'Weekend competitor working on my serve. Always up for a hit after work.'
        : isOwner
          ? 'Runs Demo Tennis Club.'
          : null,
      isDemo: true,
      accountStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      emailVerifiedAt: p.createdAt,
      agePolicyAcceptedAt: p.createdAt,
      onboardingStep: 'COMPLETE',
      onboardingCompletedAt: plus(p.createdAt, HOUR),
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    });
    const rS = singles.get(p.id);
    const rD = doubles.get(p.id);
    profileRows.push({
      id: p.profileId,
      userId: p.id,
      singlesRating: rS !== undefined ? Math.round(rS * 100) / 100 : p.level,
      doublesRating: rD !== undefined ? Math.round(rD * 100) / 100 : p.level,
      systemSuggestedLevel: isDemoPlayer ? 3.6 : p.level,
      systemSuggestedLevelSetAt: plus(p.createdAt, HOUR),
      userSelectedLevel: p.level,
      dominantHand: rand() < 0.85 ? 'RIGHT' : 'LEFT',
      experienceSignal: isDemoPlayer ? 'TWO_TO_5Y' : pick(['ONE_TO_2Y', 'TWO_TO_5Y', 'FIVE_PLUS', 'COMPETITIVE']),
      onboardingGoals: isDemoPlayer ? ['play_more', 'win_matches', 'improve_serve'] : ['play_more'],
      formatPreference: isDemoPlayer ? 'EITHER' : pick(['SINGLES', 'DOUBLES', 'EITHER']),
      stylePreference: isDemoPlayer ? 'COMPETITIVE' : pick(['SOCIAL', 'COMPETITIVE', 'EITHER']),
      preferredTimeSlots: isDemoPlayer ? ['EVENING', 'MORNING'] : [pick(['MORNING', 'AFTERNOON', 'EVENING'])],
      generalLocation: 'Clapham, London',
      latitude: isDemoPlayer || isOwner ? CLUB_LAT : p.lat,
      longitude: isDemoPlayer || isOwner ? CLUB_LNG : p.lng,
      locationSource: 'MANUAL',
      preferredClubName: CLUB_NAME,
      preferredCourtNames: [],
      padelInterest: isDemoPlayer ? 'WANT_TO_LEARN' : 'NO',
      skillBreakdownVisibility: 'EVERYONE',
      availabilityVisibility: 'EVERYONE',
      createdAt: p.createdAt,
      updatedAt: NOW,
    });
  }
  // availability
  const demoSlots = [[0, 'MORNING'], [2, 'EVENING'], [4, 'EVENING'], [6, 'MORNING']];
  for (const [d, b] of demoSlots) {
    slotRows.push({ id: randomUUID(), tennisProfileId: demoPlayer.profileId, dayOfWeek: d, timeBlock: b, createdAt: demoPlayer.createdAt });
  }
  for (const c of cast.slice(0, 30)) {
    const seen = new Set();
    for (let k = 0; k < 2; k++) {
      const d = int(0, 6);
      const b = pick(['MORNING', 'AFTERNOON', 'EVENING']);
      if (seen.has(`${d}${b}`)) continue;
      seen.add(`${d}${b}`);
      slotRows.push({ id: randomUUID(), tennisProfileId: c.profileId, dayOfWeek: d, timeBlock: b, createdAt: c.createdAt });
    }
  }
  // assessments (1-7 scale "average" -> level via 1 + (avg-1)*1.2)
  const breakdownFor = (level, bias = 0) => {
    const avg = 1 + (level - 1) / 1.2 + bias;
    return Object.fromEntries(PILLARS.map((k) => [k, round1(clamp(avg + (rand() - 0.5) * 1.2, 1, 6))]));
  };
  const branchFor = (l) => (l < 2.5 ? 'BEGINNER' : l < 3.5 ? 'FOUNDATIONAL' : l < 5 ? 'INTERMEDIATE' : 'ADVANCED');
  for (const c of cast.slice(0, 30)) {
    assessRows.push({
      id: randomUUID(),
      tennisProfileId: c.profileId,
      branch: branchFor(c.level),
      currentTier: branchFor(c.level),
      questionBudget: 12,
      status: 'COMPLETED',
      resultSystemSuggestedLevel: c.level,
      resultSkillBreakdown: breakdownFor(c.level),
      startedAt: plus(c.createdAt, HOUR),
      completedAt: plus(c.createdAt, HOUR + 15 * 60_000),
      createdAt: plus(c.createdAt, HOUR),
    });
  }
  // demo player: initial assessment then a re-assessment showing improvement
  const initialBreakdown = { FOREHAND: 3.6, BACKHAND: 2.8, SERVE: 3.0, RETURN: 3.1, NET_PLAY: 2.5, MOVEMENT: 3.4, MATCH_PLAY: 3.2 };
  const laterBreakdown = { FOREHAND: 4.0, BACKHAND: 3.7, SERVE: 3.6, RETURN: 3.5, NET_PLAY: 3.0, MOVEMENT: 3.7, MATCH_PLAY: 3.9 };
  assessRows.push(
    {
      id: randomUUID(), tennisProfileId: demoPlayer.profileId, branch: 'FOUNDATIONAL', currentTier: 'FOUNDATIONAL', questionBudget: 12,
      status: 'COMPLETED', resultSystemSuggestedLevel: 3.6, resultSkillBreakdown: initialBreakdown,
      startedAt: at(-88, 10), completedAt: at(-88, 10, 20), createdAt: at(-88, 10),
    },
    {
      id: randomUUID(), tennisProfileId: demoPlayer.profileId, branch: 'INTERMEDIATE', currentTier: 'INTERMEDIATE', questionBudget: 12,
      status: 'COMPLETED', resultSystemSuggestedLevel: 4.1, resultSkillBreakdown: laterBreakdown,
      startedAt: at(-30, 10), completedAt: at(-30, 10, 20), createdAt: at(-30, 10),
    },
  );

  // ---------- emit matches / results / threads ----------
  const matchRows = [];
  const partRows = [];
  const resultRows = [];
  const convRows = [];
  const convPartRows = [];
  const msgRows = [];
  const notifRows = [];
  const nameOf = (id) => {
    const p = allPeople.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : 'A player';
  };
  const unreadThreads = new Set([incoming.id, upcoming2.id, pending.id]);

  for (const s of specs) {
    const stateByKind = {
      SCORE: 'COMPLETED',
      WALKOVER: 'WALKOVER',
      RETIREMENT: 'RETIRED',
      PENDING: 'SCHEDULED',
      DISPUTED: 'DISPUTED',
      SCHEDULED: 'SCHEDULED',
      SCHEDULING: 'SCHEDULING',
      PROPOSED: 'PROPOSED',
    };
    const resolvedAt =
      s.kind === 'SCORE' || s.kind === 'RETIREMENT' || s.kind === 'WALKOVER'
        ? plus(s.time, int(3, 20) * HOUR)
        : null;
    const submittedAt = s.time ? plus(s.time, 90 * 60_000) : null;
    const updatedAt =
      resolvedAt ??
      (s.kind === 'PENDING' || s.kind === 'DISPUTED' ? plus(submittedAt, 2 * HOUR) : s.createdAt);

    matchRows.push({
      id: s.id,
      sport: 'TENNIS',
      format: s.format,
      state: stateByKind[s.kind],
      createdById: s.creator,
      confirmedTime: s.time,
      courtName: s.courtName,
      courtId: s.courtId,
      proposalRound: s.kind === 'PROPOSED' ? 0 : 1,
      expiresAt: s.expiresAt ?? null,
      createdAt: s.createdAt,
      updatedAt,
    });

    // participants
    const sideIds = [['A', s.a], ['B', s.b]];
    for (const [side, ids] of sideIds) {
      ids.forEach((uid, idx) => {
        const isCreator = uid === s.creator;
        const role = s.fixtureOnly ? 'OPPONENT' : isCreator ? 'CHALLENGER' : idx === 1 || (side === 'A' && !isCreator) ? 'PARTNER' : 'OPPONENT';
        const invited = s.kind === 'PROPOSED' && !isCreator;
        partRows.push({
          id: randomUUID(),
          matchId: s.id,
          userId: uid,
          side,
          role: s.format === 'SINGLES' && !s.fixtureOnly ? (isCreator ? 'CHALLENGER' : 'OPPONENT') : role,
          status: invited ? 'INVITED' : 'ACCEPTED',
          respondedAt: invited ? null : plus(s.createdAt, isCreator ? 0 : 2 * HOUR),
          createdAt: s.createdAt,
        });
      });
    }

    // results
    const submitterId = (() => {
      if (s.submittedByOpponent === true) return s.a.includes(demoPlayer.id) ? s.b[0] : s.a[0];
      if (s.submittedByOpponent === false) return s.a[0];
      // otherwise the winning side (or creator for walkovers) submitted
      return s.winner === 'B' ? s.b[0] : s.a[0];
    })();
    const otherSide = (uid) => (s.a.includes(uid) ? s.b[0] : s.a[0]);
    if (s.kind === 'SCORE' || s.kind === 'RETIREMENT') {
      resultRows.push({
        id: randomUUID(), matchId: s.id, status: 'CONFIRMED',
        outcome: s.kind === 'SCORE' ? 'SCORE' : 'RETIREMENT',
        sets: s.sets, winningSide: s.winner,
        submittedById: submitterId, submittedAt,
        confirmedById: otherSide(submitterId), confirmedAt: resolvedAt, resolvedAt,
        ratingDeltaA: s.deltaA, ratingDeltaB: s.deltaB,
      });
    } else if (s.kind === 'WALKOVER') {
      resultRows.push({
        id: randomUUID(), matchId: s.id, status: 'CONFIRMED', outcome: 'WALKOVER',
        sets: Prisma.DbNull, winningSide: null,
        submittedById: s.a[0], submittedAt,
        confirmedById: s.b[0], confirmedAt: resolvedAt, resolvedAt,
      });
    } else if (s.kind === 'PENDING') {
      resultRows.push({
        id: randomUUID(), matchId: s.id, status: 'PENDING_CONFIRMATION', outcome: 'SCORE',
        sets: s.sets, winningSide: s.winner, submittedById: submitterId, submittedAt,
      });
    } else if (s.kind === 'DISPUTED') {
      const disputer = otherSide(submitterId);
      resultRows.push({
        id: randomUUID(), matchId: s.id, status: 'DISPUTED', outcome: 'SCORE',
        sets: s.sets, winningSide: s.winner, submittedById: submitterId, submittedAt,
        disputedById: disputer, disputedAt: plus(submittedAt, 3 * HOUR),
        disputantOutcome: 'SCORE', disputantSets: s.disputantSets, disputantWinningSide: s.disputantWinner,
      });
    }

    // conversation + thread
    if (s.chat) {
      const convId = randomUUID();
      const opp = s.a.includes(demoPlayer.id) ? s.b[0] : s.a[0];
      const creatorId = s.creator;
      const other = creatorId === demoPlayer.id ? opp : creatorId === opp ? demoPlayer.id : opp;
      const sys = (body, event, t) => ({
        id: randomUUID(), conversationId: convId, senderId: null, kind: 'SYSTEM',
        body, systemEvent: event, relatedMatchId: s.id, createdAt: t,
      });
      const txt = (uid, body, t) => ({
        id: randomUUID(), conversationId: convId, senderId: uid, kind: 'TEXT', body, createdAt: t,
      });
      const t0 = s.createdAt;
      const msgs = [];
      msgs.push(sys(`${nameOf(creatorId)} sent a challenge.`, 'match_challenge_sent', t0));
      if (s.kind === 'PROPOSED') {
        msgs.push(txt(creatorId, pick(CHAT_OPENERS), plus(t0, 10 * 60_000)));
      } else {
        msgs.push(sys('Challenge accepted.', 'match_challenge_accepted', plus(t0, HOUR)));
        msgs.push(txt(creatorId, pick(CHAT_OPENERS), plus(t0, 2 * HOUR)));
        msgs.push(txt(other === creatorId ? opp : other, pick(CHAT_REPLIES), plus(t0, 3 * HOUR)));
        msgs.push(txt(creatorId, pick(CHAT_LOGISTICS), plus(t0, 4 * HOUR)));
        msgs.push(sys('Match confirmed.', 'match_confirmed', plus(t0, 5 * HOUR)));
        if (submittedAt && s.kind !== 'SCHEDULED') {
          msgs.push(sys('A result was submitted.', 'result_submitted', submittedAt));
        }
        if (s.kind === 'SCORE' || s.kind === 'RETIREMENT') {
          msgs.push(sys('Result confirmed.', 'result_confirmed', resolvedAt));
        }
        if (s.kind === 'DISPUTED') {
          msgs.push(sys('The result was disputed.', 'result_disputed', plus(submittedAt, 3 * HOUR)));
        }
      }
      // Threads flagged unread end on a message from the opponent.
      if (unreadThreads.has(s.id) && s.kind !== 'PROPOSED') {
        msgs.push(txt(opp, pick(['Good match — let me know when you’ve checked the score.', 'See you on court!', 'Running 10 mins late, sorry!']), plus(msgs.at(-1).createdAt, 40 * 60_000)));
      }
      const last = msgs.at(-1).createdAt;
      convRows.push({ id: convId, type: 'MATCH', matchId: s.id, lastMessageAt: last, createdAt: t0, updatedAt: last });
      const unread = unreadThreads.has(s.id);
      convPartRows.push(
        {
          id: randomUUID(), conversationId: convId, userId: demoPlayer.id,
          lastReadAt: unread ? plus(msgs.at(-2)?.createdAt ?? t0, 60_000) : plus(last, 60_000),
          createdAt: t0,
        },
        { id: randomUUID(), conversationId: convId, userId: opp, lastReadAt: last, createdAt: t0 },
      );
      msgRows.push(...msgs);
      s.convId = convId;
    }
  }
  // Doubles/other participants that aren't the demo player don't get threads.

  // ---------- connections (one direction per pair) ----------
  const connRows = [];
  const connFor = [];
  cast.slice(0, 10).forEach((c, i) => {
    const t = at(-85 + i * 8, 14);
    const row = {
      id: randomUUID(),
      requesterId: i % 2 === 0 ? demoPlayer.id : c.id,
      addresseeId: i % 2 === 0 ? c.id : demoPlayer.id,
      status: 'ACCEPTED',
      respondedAt: plus(t, 3 * HOUR),
      createdAt: t,
      updatedAt: plus(t, 3 * HOUR),
    };
    connRows.push(row);
    connFor.push({ ...row, other: c });
  });
  const pendingIn = [P(13), P(14)].map((c, i) => ({
    id: randomUUID(), requesterId: c.id, addresseeId: demoPlayer.id, status: 'PENDING',
    respondedAt: null, createdAt: at(-1 - i, 16), updatedAt: at(-1 - i, 16), other: c,
  }));
  const pendingOut = {
    id: randomUUID(), requesterId: demoPlayer.id, addresseeId: P(15).id, status: 'PENDING',
    respondedAt: null, createdAt: at(-2, 20), updatedAt: at(-2, 20), other: P(15),
  };
  for (const r of [...pendingIn, pendingOut]) {
    const { other, ...row } = r;
    connRows.push(row);
  }

  // ---------- learning: practice, goals ----------
  // `practice_sessions.drillId` is a foreign key to learning_content, and the
  // catalogue comes from `prisma/seed.ts`, which production may never have
  // run. Link a drill only when it exists; otherwise the session is saved
  // without one rather than the whole seed failing halfway through.
  const knownDrills = new Set(
    (await prisma.learningContent.findMany({ select: { id: true } })).map((c) => c.id),
  );
  if (knownDrills.size === 0) {
    log('warning: learning catalogue is empty — practice sessions will have no drill links');
  }
  const practiceRows = [];
  const skillSpread = ['SERVE', 'SERVE', 'BACKHAND', 'BACKHAND', 'FOREHAND', 'RETURN', 'NET_PLAY', 'MOVEMENT', 'MATCH_PLAY'];
  for (let i = 0; i < 22; i++) {
    const day = -86 + Math.round((i * 84) / 21);
    const skill = pick(skillSpread);
    const progress = i / 21;
    practiceRows.push({
      id: randomUUID(),
      tennisProfileId: demoPlayer.profileId,
      occurredAt: at(day, int(7, 19), pick([0, 15, 30, 45])),
      durationMinutes: pick([30, 45, 60, 60, 90]),
      skillFocus: skill,
      drillId: knownDrills.has(DRILL_FOR[skill]) ? DRILL_FOR[skill] : null,
      notes: rand() < 0.4 ? pick(['Felt sharp today.', 'Toss was inconsistent early on.', 'Worked on depth, not pace.', 'Legs heavy, still got the reps in.']) : null,
      perceivedPerformance: clamp(Math.round(2.2 + progress * 2 + (rand() - 0.5) * 1.6), 1, 5),
      createdAt: at(day, 21),
    });
  }
  const goalDefs = [
    { skill: 'SERVE', baseline: 3.0, target: 4.5, deadline: at(30), createdAt: at(-70, 9), achievedAt: null, ms: [['Hit 60% first serves in a match', at(-40, 20)], ['Add a reliable kick serve', null], ['Serve out wide on deuce', null]] },
    { skill: 'BACKHAND', baseline: 2.8, target: 3.7, deadline: at(-10), createdAt: at(-80, 9), achievedAt: at(-12, 19), ms: [['20 crosscourt backhands in a row', at(-55, 19)], ['Slice backhand under pressure', at(-30, 19)]] },
    { skill: 'FOREHAND', baseline: 3.5, target: 4.5, deadline: at(45), createdAt: at(-35, 9), achievedAt: null, ms: [['Add inside-out forehand', null]] },
    { skill: 'NET_PLAY', baseline: 2.5, target: 3.5, deadline: at(60), createdAt: at(-20, 9), achievedAt: null, ms: [['Win 3 points a match at the net', null], ['Clean volley drill 10/10', null]] },
  ];
  const goalRows = [];
  const milestoneRows = [];
  for (const g of goalDefs) {
    const id = randomUUID();
    goalRows.push({
      id, tennisProfileId: demoPlayer.profileId, skill: g.skill, baseline: g.baseline, target: g.target,
      deadline: g.deadline, achievedAt: g.achievedAt, createdAt: g.createdAt, updatedAt: g.achievedAt ?? NOW,
    });
    for (const [label, doneAt] of g.ms) {
      milestoneRows.push({ id: randomUUID(), goalId: id, label, achievedAt: doneAt, createdAt: g.createdAt });
    }
  }

  // ---------- club: memberships ----------
  const roleFor = (i) => {
    if (i === 0) return 'ADMIN';
    if (i === 1) return 'COMPETITION_MANAGER';
    if (i === 2) return 'CONTENT_MANAGER';
    if (i >= 3 && i <= 5) return 'COACH';
    return 'READ_ONLY';
  };
  const statusFor = (i) => {
    if ([54, 55, 56, 57].includes(i)) return 'PENDING';
    if (i === 58) return 'SUSPENDED';
    if (i === 59) return 'INVITED';
    return 'ACTIVE';
  };
  const membershipRows = [
    { id: randomUUID(), clubId, userId: owner.id, role: 'OWNER', status: 'ACTIVE', createdAt: at(-90, 9) },
    { id: randomUUID(), clubId, userId: demoPlayer.id, role: 'READ_ONLY', status: 'ACTIVE', createdAt: at(-85, 11) },
    ...cast.map((c, i) => ({
      id: randomUUID(), clubId, userId: c.id, role: roleFor(i), status: statusFor(i),
      createdAt: clampStart(at(c.joinDay, int(8, 20))),
    })),
  ];
  const activeMembers = cast.filter((_, i) => statusFor(i) === 'ACTIVE');

  // ---------- club: courts ----------
  const courtRows = [
    {
      id: mainCourtId, name: `${CLUB_NAME} – Outdoor Courts`, address: '14 Northcote Road, Clapham, London',
      latitude: CLUB_LAT, longitude: CLUB_LNG, clubId, phone: '+44 20 7946 0000', website: 'https://demo.driftsports.app',
      bookingType: 'CONTACT_ONLY', amenities: ['Floodlights', 'Clubhouse', 'Showers', 'Parking'],
      openingHoursNote: 'Mon–Fri 7am–10pm, Sat–Sun 8am–8pm', isPublic: false,
      verificationStatus: 'VERIFIED', googlePlacesSyncStatus: 'STALE', createdAt: at(-90, 9), updatedAt: at(-30, 9),
    },
    {
      id: indoorCourtId, name: `${CLUB_NAME} – Indoor Hall`, address: '14 Northcote Road, Clapham, London',
      latitude: CLUB_LAT + 0.0004, longitude: CLUB_LNG, clubId, phone: '+44 20 7946 0000',
      bookingType: 'CONTACT_ONLY', amenities: ['Heated', 'Pro shop', 'Coaching'],
      openingHoursNote: 'Daily 7am–10pm', isPublic: false,
      verificationStatus: 'VERIFIED', googlePlacesSyncStatus: 'STALE', createdAt: at(-88, 9), updatedAt: at(-30, 9),
    },
    {
      id: padelCourtId, name: `${CLUB_NAME} – Padel Courts`, address: '14 Northcote Road, Clapham, London',
      latitude: CLUB_LAT - 0.0004, longitude: CLUB_LNG, clubId,
      bookingType: 'EXTERNAL_LINK', bookingUrl: 'https://demo.driftsports.app/book', amenities: ['Floodlights'],
      isPublic: false, verificationStatus: 'PENDING', googlePlacesSyncStatus: 'STALE', createdAt: at(-60, 9), updatedAt: at(-20, 9),
    },
  ];
  const courtGroupRows = [
    { id: randomUUID(), courtId: mainCourtId, sport: 'TENNIS', surface: 'HARD', indoor: false, lighting: true, count: 4 },
    { id: randomUUID(), courtId: mainCourtId, sport: 'TENNIS', surface: 'CLAY', indoor: false, lighting: false, count: 2 },
    { id: randomUUID(), courtId: indoorCourtId, sport: 'TENNIS', surface: 'HARD', indoor: true, lighting: true, count: 2 },
    { id: randomUUID(), courtId: padelCourtId, sport: 'PADEL', surface: 'ARTIFICIAL_GRASS', indoor: false, lighting: true, count: 2 },
  ];
  const inquiryRows = [];
  for (let i = 0; i < 420; i++) {
    const r = rand();
    const kind = r < 0.65 ? 'PROFILE_VIEW' : r < 0.87 ? 'CONTACT' : 'BOOKING';
    const daysAgo = Math.floor(90 * (1 - rand() ** 0.6)); // skew recent
    inquiryRows.push({
      id: randomUUID(), clubId, courtId: pick([mainCourtId, mainCourtId, indoorCourtId, padelCourtId]),
      viewerId: rand() < 0.6 ? pick(activeMembers).id : null, kind,
      createdAt: at(-(daysAgo + 1), int(7, 21), int(0, 59)),
    });
  }
  const courtReportRows = [
    { id: randomUUID(), courtId: mainCourtId, reporterId: P(20).id, reason: 'INCORRECT_INFO', notes: 'Opening hours on Sundays look out of date.', status: 'OPEN', priority: 'NORMAL', createdAt: at(-3, 11) },
    { id: randomUUID(), courtId: indoorCourtId, reporterId: P(22).id, reason: 'OTHER', notes: 'Lighting on court 2 flickers in the evening.', status: 'RESOLVED', priority: 'NORMAL', createdAt: at(-40, 18) },
  ];

  // ---------- club: coaches ----------
  const coachDefs = [
    [3, ['Serve technique', 'Junior development'], ['LTA Level 3'], 12, ['BEGINNER', 'INTERMEDIATE']],
    [4, ['Match tactics', 'Doubles strategy'], ['LTA Level 4', 'First Aid'], 8, ['INTERMEDIATE', 'ADVANCED', 'COMPETITIVE']],
    [5, ['Fitness & movement', 'Cardio tennis'], ['LTA Level 2'], 5, ['BEGINNER', 'INTERMEDIATE']],
  ];
  const coachRows = [];
  const coachAffRows = [];
  for (const [i, spec, quals, years, levels] of coachDefs) {
    const id = randomUUID();
    coachRows.push({
      id, userId: P(i).id, bio: `${P(i).firstName} coaches at ${CLUB_NAME} — all levels welcome.`,
      qualifications: quals, yearsExperience: years, specialisations: spec, levels,
      availabilityNote: 'Weekday evenings and weekend mornings.', publicEmail: `${P(i).firstName.toLowerCase()}@${DOMAIN}`,
      bookingUrl: 'https://demo.driftsports.app/book', verificationStatus: 'VERIFIED', createdAt: at(-80, 10), updatedAt: at(-20, 10),
    });
    coachAffRows.push({ id: randomUUID(), coachProfileId: id, clubId, createdAt: at(-80, 10) });
  }

  // ---------- club: announcements ----------
  const announcementDefs = [
    ['Welcome to Demo Tennis Club', 'Our new season starts today. Court booking is open to all members — see the clubhouse board for coaching slots.', true, 'PUBLISHED', 'EVERYONE', -82],
    ['Floodlight upgrade complete', 'All four outdoor courts now have new LED floodlights. Evening sessions can run until 10pm.', false, 'PUBLISHED', 'EVERYONE', -66],
    ['Summer Singles League: registration open', 'Eight places, weekly rounds, prizes for the top two. Register in the app.', false, 'PUBLISHED', 'EVERYONE', -60],
    ['Coach team announcement', 'Please welcome our three new coaches. Bookings open Monday.', false, 'PUBLISHED', 'MEMBERS', -50],
    ['Committee meeting minutes', 'Draft minutes for August are attached for admins to review.', false, 'PUBLISHED', 'ADMINS', -35],
    ['Summer League final results', 'Congratulations to all players — full standings are now in the archive.', false, 'PUBLISHED', 'EVERYONE', -27],
    ['Autumn Kickoff Open Day this week', 'Free taster sessions, kids’ coaching and a BBQ. Bring a friend.', false, 'PUBLISHED', 'EVERYONE', -6],
    ['Autumn Singles League is underway', 'Round 1 is open — get your fixtures scheduled before the deadline.', false, 'PUBLISHED', 'EVERYONE', -2],
    ['Winter fixtures (draft)', 'Working draft — dates to be confirmed by the committee.', false, 'DRAFT', 'EVERYONE', -1],
    ['Junior programme changes (draft)', 'Draft of the new junior group structure.', false, 'DRAFT', 'COACHES', -8],
  ];
  const announcementRows = announcementDefs.map(([title, body, pinned, status, audience, day]) => ({
    id: randomUUID(), clubId, authorId: owner.id, title, body, pinned, status, audience,
    publishedAt: status === 'PUBLISHED' ? at(day, 9) : null, createdAt: at(day, 8), updatedAt: at(day, 9),
  }));

  // ---------- club: posts, reactions, moderation ----------
  const POSTS = [
    'Anyone up for doubles Saturday morning? Need a fourth.',
    'Found a grey Wilson racket bag by court 3 — it’s at the front desk.',
    'Huge thanks to the coaches for the serve clinic, my toss is finally consistent!',
    'Court 2 has a wet patch near the baseline after the rain, careful out there.',
    'Who’s playing in the Autumn League? Looking for a practice partner.',
    'Reminder: floodlights go off at 10pm sharp.',
    'Great turnout at the BBQ yesterday 🎾',
    'Selling a barely used Babolat Pure Drive, message me.',
    'Any recommendations for a good stringer nearby?',
    'Can we get a second ball machine at the club?',
    'Loved the cardio tennis session, same time next week?',
    'Junior camp photos are up on the notice board.',
    'Looking for a hitting partner around 4.0, weekday evenings.',
    'Well played everyone in the qualifiers, some brilliant rallies.',
    'Is the indoor hall free on Sunday afternoon?',
    'Lost a water bottle near the clubhouse — blue with a black lid.',
    'Anyone want to form a team for the winter doubles league?',
    'The new floodlights are amazing 👏',
    'Sunday round robin was so much fun. Thanks for organising!',
    'Tips for a kick serve? Struggling with the toss.',
    'Parking is tight on match nights — carpool if you can.',
    'Congrats to the league champion! Well deserved.',
    'New members: come say hi at the Open Day.',
    'Does anyone know the padel court opening date?',
    'Great win against a tough opponent today, felt like I finally read the game.',
  ];
  const EMOJI = ['👍', '🎾', '🔥', '👏', '❤️'];
  const postRows = POSTS.map((body, i) => {
    const day = -85 + Math.round((i * 83) / (POSTS.length - 1));
    return {
      id: randomUUID(), clubId, authorId: pick(activeMembers).id, body,
      deletedAt: null, deletedById: null, createdAt: at(day, int(8, 21), int(0, 59)),
    };
  });
  const reactionRows = [];
  for (const post of postRows) {
    const seen = new Set();
    const n = int(1, 7);
    for (let k = 0; k < n; k++) {
      const u = pick(activeMembers);
      const e = pick(EMOJI);
      const key = `${u.id}${e}`;
      if (seen.has(key)) continue;
      seen.add(key);
      reactionRows.push({
        id: randomUUID(), postId: post.id, userId: u.id, emoji: e,
        createdAt: plus(post.createdAt, int(10, 2000) * 60_000),
      });
    }
  }
  postRows[10].deletedAt = at(-12, 10);
  postRows[10].deletedById = owner.id;
  const modReportRows = [
    { postIdx: 3, reason: 'Spam / promotional link', status: 'PENDING', priority: 'NORMAL', day: -2 },
    { postIdx: 9, reason: 'Abusive language toward another member', status: 'PENDING', priority: 'HIGH', day: -1 },
    { postIdx: 14, reason: 'Harassment', status: 'ESCALATED', priority: 'URGENT', day: -4 },
    { postIdx: 6, reason: 'Off-topic', status: 'APPROVED', priority: 'NORMAL', day: -30, resolved: true },
    { postIdx: 10, reason: 'Inappropriate content', status: 'REMOVED', priority: 'NORMAL', day: -13, resolved: true },
  ].map((r) => ({
    id: randomUUID(), clubId, postId: postRows[r.postIdx].id, reporterId: pick(activeMembers).id,
    reason: r.reason, status: r.status, priority: r.priority,
    resolvedById: r.resolved ? owner.id : null, resolvedAt: r.resolved ? at(r.day + 1, 11) : null, createdAt: at(r.day, 15),
  }));

  // ---------- club: events + registrations ----------
  const eventDefs = [
    ['Season Opener Social Mixer', -80, 40, 'COMPLETED'],
    ['Beginner Clinic: Serve Fundamentals', -71, 16, 'COMPLETED'],
    ['Ladies Doubles Morning', -62, 24, 'COMPLETED'],
    ['Junior Coaching Camp', -55, 20, 'COMPLETED'],
    ['Summer Round Robin Night', -44, 32, 'COMPLETED'],
    ['Club Championship Qualifiers', -33, 24, 'COMPLETED'],
    ['Cardio Tennis Workshop', -21, 20, 'COMPLETED'],
    ['Members BBQ & Mixed Doubles', -9, 40, 'COMPLETED'],
    ['Autumn Kickoff Open Day', 4, 50, 'PUBLISHED'],
    ['Advanced Match Play Clinic', 11, 12, 'PUBLISHED'],
    ['Winter League Info Evening', 19, 30, 'PUBLISHED'],
    ['End-of-Year Gala Dinner', 55, 80, 'DRAFT'],
    ['Rain-affected Doubles Social', 6, 24, 'CANCELLED'],
  ];
  const eventRows = [];
  const eventRegRows = [];
  const eventIds = [];
  for (const [name, day, cap, status] of eventDefs) {
    const id = randomUUID();
    eventIds.push({ id, name, day, status });
    const startsAt = at(day, 18, 0);
    eventRows.push({
      id, clubId, createdById: owner.id, name,
      description: `${name} at ${CLUB_NAME}. Everyone welcome — spaces are limited, so register early.`,
      startsAt, endsAt: plus(startsAt, 2 * HOUR), capacity: cap, status,
      createdAt: clampStart(plus(startsAt, -25 * DAY)), updatedAt: clampStart(plus(startsAt, -10 * DAY)),
    });
    if (status === 'DRAFT') continue;
    const past = day < 0;
    const n = status === 'CANCELLED' ? 6 : Math.round(cap * (0.55 + rand() * 0.4));
    for (const u of shuffle(activeMembers).slice(0, Math.min(n, activeMembers.length))) {
      let regStatus = 'REGISTERED';
      let attendedAt = null;
      if (status === 'CANCELLED') regStatus = 'CANCELLED';
      else if (past) {
        const r = rand();
        regStatus = r < 0.75 ? 'ATTENDED' : r < 0.87 ? 'NO_SHOW' : 'CANCELLED';
        if (regStatus === 'ATTENDED') attendedAt = plus(startsAt, HOUR);
      } else if (rand() < 0.06) regStatus = 'CANCELLED';
      eventRegRows.push({
        id: randomUUID(), eventId: id, userId: u.id, status: regStatus,
        // Never in the future (upcoming events), never before the window.
        registeredAt: clampStart(new Date(Math.min(plus(startsAt, -int(3, 20) * DAY).getTime(), NOW.getTime() - int(1, 48) * HOUR))),
        attendedAt,
      });
    }
  }

  // ---------- competitions: league rows ----------
  const leagueRows = [];
  const regRows = [];
  const roundRows = [];
  const fixtureRows = [];
  const awardRows = [];
  const standingRows = [];
  for (const L of leagues) {
    leagueRows.push({
      id: L.id, clubId, sport: 'TENNIS', name: L.name,
      description: `${L.name} at ${CLUB_NAME}.`,
      rulesText: 'Best of three sets, match tiebreak at 1-1. Agree a time with your opponent within the round.',
      scoringFormat: 'Best of 3 sets', walkoverRule: 'Unplayed fixtures at the deadline are recorded as a walkover for neither player.',
      unfinishedMatchPolicy: 'Retirement counts as a win for the opponent.',
      format: L.format ?? 'SINGLES', state: 'PUBLISHED',
      registrationOpensAt: L.registrationOpensAt, registrationClosesAt: L.registrationClosesAt,
      startsAt: L.startsAt, roundCount: L.roundCount, roundIntervalMinutes: L.intervalMin,
      capacity: L.capacity, completedAt: L.completedAt,
      createdAt: plus(L.registrationOpensAt, -3 * DAY), updatedAt: L.completedAt ?? NOW,
    });
    L.players.forEach((p, i) => {
      regRows.push({
        id: randomUUID(), leagueId: L.id, userId: p.id, status: 'ENROLLED',
        registeredAt: plus(L.registrationOpensAt, (i + 1) * 5 * HOUR + int(0, 3) * HOUR),
      });
    });
    for (const r of L.rounds) {
      roundRows.push({
        id: r.id, leagueId: L.id, index: r.index, deadline: r.deadline,
        openedAt: r.openedAt, closedAt: r.closedAt, createdAt: L.startsAt,
      });
      for (const f of r.fixtures) {
        fixtureRows.push({
          id: f.id, roundId: r.id, sideAUserId: f.sideA, sideBUserId: f.sideB,
          matchId: f.matchId, createdAt: L.startsAt,
        });
      }
    }
  }
  // a withdrawn registration for variety
  regRows.push({
    id: randomUUID(), leagueId: l1.id, userId: P(20).id, status: 'WITHDRAWN', registeredAt: at(-86, 12),
  });
  // League 1 standings (mirrors the live tally: COMPLETED + decided matches only)
  {
    const tally = new Map(l1.players.map((p) => [p.id, { w: 0, l: 0 }]));
    for (const r of l1.rounds) {
      for (const f of r.fixtures) {
        const s = f.specRef;
        if (s.kind !== 'SCORE') continue;
        const winnerId = s.winner === 'A' ? s.a[0] : s.b[0];
        const loserId = s.winner === 'A' ? s.b[0] : s.a[0];
        tally.get(winnerId).w++;
        tally.get(loserId).l++;
      }
    }
    const ranked = [...tally.entries()]
      .map(([id, t]) => ({ id, ...t, pts: t.w * 3 }))
      .sort((x, y) => y.pts - x.pts || y.w - x.w);
    ranked.forEach((r, i) => {
      standingRows.push({
        id: randomUUID(), leagueId: l1.id, userId: r.id, rank: i + 1, points: r.pts, wins: r.w, losses: r.l,
        previousRank: i === 0 ? 2 : i === 1 ? 1 : i + 1, updatedAt: l1.completedAt,
      });
    });
    awardRows.push(
      { id: randomUUID(), leagueId: l1.id, recipientId: ranked[0].id, issuedById: owner.id, title: 'Summer Singles Champion', notes: 'Undefeated run through the final rounds.', issuedAt: plus(l1.completedAt, 3 * HOUR) },
      { id: randomUUID(), leagueId: l1.id, recipientId: ranked[1].id, issuedById: owner.id, title: 'Summer Singles Runner-up', notes: null, issuedAt: plus(l1.completedAt, 3 * HOUR) },
    );
    l1.ranked = ranked;
  }

  // ---------- tournaments ----------
  const tournamentRows = [];
  const tEntryRows = [];
  const tRoundRows = [];
  const tFixtureRows = [];
  {
    const t1 = randomUUID();
    tournamentRows.push({
      id: t1, clubId, sport: 'TENNIS', name: 'Club Championship', description: 'Knockout singles — best of three sets.',
      drawSize: 8, state: 'RUNNING', registrationClosesAt: at(-25, 21), createdAt: at(-40, 9),
    });
    const seeds = cast.slice(0, 8);
    seeds.forEach((p, i) => tEntryRows.push({ id: randomUUID(), tournamentId: t1, userId: p.id, seed: i + 1, createdAt: at(-38 + i, 12) }));
    const r1 = randomUUID(), r2 = randomUUID(), r3 = randomUUID();
    tRoundRows.push({ id: r1, tournamentId: t1, index: 1 }, { id: r2, tournamentId: t1, index: 2 }, { id: r3, tournamentId: t1, index: 3 });
    const pairs = [[0, 7], [3, 4], [1, 6], [2, 5]];
    const winners = [];
    pairs.forEach(([a, b], slot) => {
      const w = a; // higher seed wins round 1
      winners.push(seeds[w].id);
      tFixtureRows.push({ id: randomUUID(), roundId: r1, slotIndex: slot, sideAUserId: seeds[a].id, sideBUserId: seeds[b].id, isBye: false, winnerUserId: seeds[w].id, matchId: null });
    });
    tFixtureRows.push(
      { id: randomUUID(), roundId: r2, slotIndex: 0, sideAUserId: winners[0], sideBUserId: winners[1], isBye: false, winnerUserId: winners[0], matchId: null },
      { id: randomUUID(), roundId: r2, slotIndex: 1, sideAUserId: winners[2], sideBUserId: winners[3], isBye: false, winnerUserId: null, matchId: null },
      { id: randomUUID(), roundId: r3, slotIndex: 0, sideAUserId: winners[0], sideBUserId: null, isBye: false, winnerUserId: null, matchId: null },
    );
    const t2 = randomUUID();
    tournamentRows.push({
      id: t2, clubId, sport: 'TENNIS', name: 'Winter Open', description: 'Open to all levels. 16-player draw.',
      drawSize: 16, state: 'REGISTRATION_OPEN', registrationClosesAt: at(10, 21), createdAt: at(-4, 9),
    });
    cast.slice(12, 18).forEach((p, i) => tEntryRows.push({ id: randomUUID(), tournamentId: t2, userId: p.id, seed: null, createdAt: at(-3 + i * 0.3, 12) }));
    tournamentRows.push({
      id: randomUUID(), clubId, sport: 'TENNIS', name: 'Spring Cup (draft)', description: null,
      drawSize: 8, state: 'DRAFT', registrationClosesAt: at(80, 21), createdAt: at(-1, 9),
    });
  }

  // ---------- ladder ----------
  const ladderRows = [];
  const ladderEntryRows = [];
  {
    const lid = randomUUID();
    ladderRows.push({ id: lid, clubId, sport: 'TENNIS', name: 'Club Ladder', challengeRange: 3, state: 'ACTIVE', createdAt: at(-70, 9) });
    const ladderPlayers = [...cast.slice(10, 19)];
    ladderPlayers.splice(4, 0, demoPlayer);
    ladderPlayers.forEach((p, i) => {
      ladderEntryRows.push({
        id: randomUUID(), ladderId: lid, userId: p.id, position: i + 1,
        wins: Math.max(0, 9 - i + int(-1, 1)), losses: Math.max(0, i - 1 + int(0, 2)), createdAt: at(-68 + i, 12),
      });
    });
  }

  // ---------- media (real PNG bytes) ----------
  const mediaRows = [
    ['clubhouse.png', 'Clubhouse terrace', (x, y) => [40 + (x >> 3) % 90, 110 + (y >> 2) % 90, 90]],
    ['court-lights.png', 'New floodlights', (x, y) => [20, 40 + (y >> 1) % 80, 120 + (x >> 3) % 100]],
    ['open-day.png', 'Open Day', (x, y) => [180 + (x >> 4) % 60, 90 + (y >> 3) % 60, 40]],
  ].map(([filename, caption, fn], i) => ({
    id: randomUUID(), clubId, uploadedById: owner.id, filename, mimeType: 'image/png',
    bytes: makePng(320, 200, fn), caption, createdAt: at(-75 + i * 20, 10),
  }));

  // ---------- billing ----------
  const plan =
    (await prisma.paymentPlan.findUnique({ where: { id: 'seed-plan-club-pro-usd' } })) ??
    (await prisma.paymentPlan.findFirst({ where: { audience: 'CLUB', currency: 'USD', isActive: true, priceMinor: { gt: 0 } } }));
  if (!plan) throw new Error('No paid USD club plan found (expected seed-plan-club-pro-usd). Run migrations first.');
  const billingAccountId = randomUUID();
  const pmId = randomUUID();
  const periodMs = 30 * DAY;
  const cycleEnd = at(18, 0);
  const currentStart = plus(cycleEnd, -periodMs);
  const billing = { account: { id: billingAccountId, userId: null, clubId, providerCustomerId: null, createdAt: at(-62, 10), updatedAt: NOW } };
  const invoiceRows = [];
  const txnRows = [];
  for (let k = 0; k < 3; k++) {
    const start = plus(currentStart, -(2 - k) * periodMs);
    const invId = randomUUID();
    const hex = randomBytes(4).toString('hex').toUpperCase();
    invoiceRows.push({
      id: invId, number: `DRIFT-${start.getTime()}-${hex}`, billingAccountId, planId: plan.id,
      amountMinor: plan.priceMinor, currency: plan.currency, status: 'PAID', description: 'Club Pro subscription',
      periodStart: start, periodEnd: plus(start, periodMs), paidAt: start, createdAt: start,
    });
    txnRows.push({
      id: randomUUID(), billingAccountId, invoiceId: invId, paymentMethodId: pmId, provider: 'SANDBOX',
      providerReference: `demo_txn_${randomUUID()}`, amountMinor: plan.priceMinor, currency: plan.currency,
      status: 'SUCCEEDED', failureReason: null, providerInvoiceId: null, createdAt: start,
    });
  }
  const paymentMethodRow = {
    id: pmId, billingAccountId, type: 'CARD', provider: 'SANDBOX', providerToken: `sandbox_pm_approve_${randomUUID()}`,
    brand: 'Visa', last4: '4242', label: 'Visa ending 4242', isDefault: true, removedAt: null, createdAt: at(-62, 10),
  };
  const subscriptionRow = {
    id: randomUUID(), billingAccountId, planId: plan.id, status: 'ACTIVE',
    currentPeriodStart: currentStart, currentPeriodEnd: cycleEnd, providerReference: null, provider: null,
    createdAt: at(-62, 10), updatedAt: currentStart,
  };

  // ---------- audit log ----------
  const auditRows = [];
  const audit = (day, action, entityType, entityId, metadata, actor = owner.id) =>
    auditRows.push({ id: randomUUID(), clubId, actorId: actor, action, entityType, entityId, metadata, createdAt: at(day, int(9, 17), int(0, 59)) });
  [[0, 'ADMIN'], [1, 'COMPETITION_MANAGER'], [2, 'CONTENT_MANAGER'], [3, 'COACH'], [4, 'COACH'], [5, 'COACH']].forEach(([i, role], k) => {
    audit(-88 + k, 'team.invite', 'ClubMembership', membershipRows.find((m) => m.userId === P(i).id).id, { role, email: P(i).email });
  });
  audit(-70, 'team.role.update', 'ClubMembership', membershipRows.find((m) => m.userId === P(1).id).id, { from: 'READ_ONLY', to: 'COMPETITION_MANAGER' });
  audit(-45, 'team.remove', 'ClubMembership', randomUUID(), { reason: 'Left the club' });
  eventRows.forEach((e, k) => {
    audit(Math.min(-2, Math.round((e.createdAt - NOW) / DAY)), 'event.create', 'ClubEvent', e.id, { name: e.name });
    if (e.status === 'COMPLETED') audit(Math.round((e.startsAt - NOW) / DAY) + 1, 'event.attendance.update', 'ClubEvent', e.id, { name: e.name });
    if (k % 3 === 0) audit(Math.min(-1, Math.round((e.startsAt - NOW) / DAY) - 6), 'event.update', 'ClubEvent', e.id, { name: e.name, fields: ['capacity'] });
  });
  mediaRows.forEach((m, k) => audit(-75 + k * 20, 'media.upload', 'ClubMediaAsset', m.id, { filename: m.filename }));
  modReportRows.forEach((m) => {
    if (m.resolvedAt) audit(Math.round((m.resolvedAt - NOW) / DAY), `moderation.${m.status}`, 'ClubPostModerationReport', m.id, { postId: m.postId });
  });
  audit(-80, 'notification-settings.update', 'ClubNotificationSettings', clubId, { weeklyDigest: true });
  audit(-84, 'venue.verification.submit', 'Club', clubId, {});

  // ---------- notifications for the demo player ----------
  const notifs = [];
  const notif = (t, category, title, body, type, id, unread = false) =>
    notifs.push({ id: randomUUID(), userId: demoPlayer.id, category, title, body, relatedEntityType: type, relatedEntityId: id, readAt: unread ? null : plus(t, int(5, 300) * 60_000), createdAt: t });

  const demoMatches = specs
    .filter((s) => [...s.a, ...s.b].includes(demoPlayer.id) && (s.kind === 'SCORE' || s.kind === 'RETIREMENT' || s.kind === 'WALKOVER'))
    .sort((x, y) => x.time - y.time);
  demoMatches.slice(-10).forEach((s) => {
    const opp = s.a.includes(demoPlayer.id) ? s.b[0] : s.a[0];
    notif(plus(s.time, 8 * HOUR), 'MATCHES', 'Result confirmed', `Your match against ${nameOf(opp)} has been confirmed.`, 'MATCH', s.id);
  });
  connFor.slice(0, 6).forEach((c) => {
    notif(plus(c.createdAt, 3 * HOUR), 'CONNECTIONS', 'Connection accepted', `${c.other.firstName} ${c.other.lastName} is now connected with you.`, 'CONNECTION', c.id);
  });
  l1.rounds.forEach((r) => notif(r.openedAt, 'COMPETITIONS', `Round ${r.index} is now open`, `${l1.name} — check your fixture and get a time agreed.`, 'LEAGUE', l1.id));
  notif(plus(l1.completedAt, HOUR), 'COMPETITIONS', 'Summer Singles League is complete', 'See the final standings and awards.', 'LEAGUE', l1.id);
  notif(l2.startsAt, 'COMPETITIONS', 'Round 1 is now open', `${l2.name} — check your fixture and get a time agreed.`, 'LEAGUE', l2.id);
  announcementRows.filter((a) => a.status === 'PUBLISHED' && a.audience !== 'ADMINS').slice(-4).forEach((a) => {
    notif(a.publishedAt, 'CLUBS', a.title, `New announcement from ${CLUB_NAME}.`, 'CLUB_ANNOUNCEMENT', a.id);
  });
  [at(-60, 19), at(-33, 19), at(-9, 19)].forEach((t, i) => {
    notif(t, 'LEARNING', ['You’re on a practice roll', 'New drill suggestion: serve placement', 'Goal check-in'][i], ['Three sessions this week — nice consistency.', 'Based on your serve goal, try this drill.', 'Your backhand goal is almost there.'][i], null, null);
  });
  [at(-25, 8), at(-8, 8)].forEach((t, i) => {
    notif(t, 'NEWS', ['Serve clinic: what the pros do differently', 'Club leagues are booming'][i], 'A new story you may like.', null, null);
  });
  // unread, most recent
  notif(incoming.createdAt, 'MATCHES', 'New challenge', `${nameOf(challenger.id)} challenged you to a match.`, 'MATCH', incoming.id, true);
  notif(plus(pending.time, 2 * HOUR), 'MATCHES', 'Confirm the score', `${nameOf(P(9).id)} submitted a result — please confirm or dispute.`, 'MATCH', pending.id, true);
  notif(plus(upcoming1.createdAt, HOUR), 'MATCHES', 'Match confirmed', `Your match with ${nameOf(P(2).id)} is set.`, 'MATCH', upcoming1.id, true);
  notif(at(-1, 20), 'MESSAGES', 'New message', `${nameOf(P(7).id)}: See you on court!`, 'CONVERSATION', upcoming2.convId, true);
  notif(at(-1, 10), 'CONNECTIONS', 'Connection request', `${pendingIn[0].other.firstName} ${pendingIn[0].other.lastName} wants to connect.`, 'CONNECTION', pendingIn[0].id, true);
  notif(at(-2, 11), 'COMPETITIONS', 'Result disputed', 'A result in your match was disputed — the club will review.', 'MATCH', disputed.id, true);

  // ---------- saved news / padel ----------
  const stories = await prisma.newsStory.findMany({ where: { id: { startsWith: 'seed-story-' } }, select: { id: true } });
  const savedRows = stories.slice(0, 3).map((s, i) => ({ id: randomUUID(), userId: demoPlayer.id, storyId: s.id, savedAt: at(-20 + i * 6, 12) }));
  const padelRow = {
    id: randomUUID(), userId: demoPlayer.id, dominantHand: 'RIGHT', singlesRating: null, doublesRating: null,
    systemSuggestedLevel: 2.5, systemSuggestedLevelSetAt: at(-15, 10), preferredSide: null, partnerPreference: null,
    goals: ['try_padel'], createdAt: at(-15, 10), updatedAt: at(-15, 10),
  };

  // ============================== WRITE ==============================
  log('writing…');
  await prisma.club.create({
    data: {
      id: clubId, name: CLUB_NAME, isDemo: true,
      description: 'A friendly demo club with outdoor hard and clay courts, an indoor hall, padel and a full coaching programme.',
      address: '14 Northcote Road, Clapham, London', latitude: CLUB_LAT, longitude: CLUB_LNG,
      phone: '+44 20 7946 0000', website: 'https://demo.driftsports.app', sports: ['TENNIS', 'PADEL'],
      amenities: ['Floodlights', 'Clubhouse', 'Pro shop', 'Coaching', 'Showers', 'Parking'],
      openingHoursNote: 'Daily 7am–10pm', photoUrls: [],
      verificationStatus: 'VERIFIED', platformStatus: 'ACTIVE',
      setupCompletedAt: at(-90, 10), createdAt: at(-90, 9), updatedAt: NOW,
    },
  });
  const counts = {};
  const w = async (model, rows) => { counts[model] = (counts[model] ?? 0) + (await insert(model, rows)); };

  await w('user', userRows);
  await w('tennisProfile', profileRows);
  await w('availabilitySlot', slotRows);
  await w('assessmentSession', assessRows);
  await w('padelProfile', [padelRow]);
  await w('clubMembership', membershipRows);
  await w('court', courtRows);
  await w('courtGroup', courtGroupRows);
  await w('courtInquiry', inquiryRows);
  await w('courtReport', courtReportRows);
  await w('coachProfile', coachRows);
  await w('coachClubAffiliation', coachAffRows);
  await w('clubNotificationSettings', [{ id: randomUUID(), clubId, membershipChanges: true, competitionUpdates: true, eventRegistrations: true, moderationAlerts: true, weeklyDigest: true, updatedAt: at(-80, 10) }]);
  await w('announcement', announcementRows);
  await w('clubPost', postRows);
  await w('clubPostReaction', reactionRows);
  await w('clubPostModerationReport', modReportRows);
  await w('clubEvent', eventRows);
  await w('clubEventRegistration', eventRegRows);
  await w('clubMediaAsset', mediaRows);
  await w('league', leagueRows);
  await w('leagueRegistration', regRows);
  await w('round', roundRows);
  await w('match', matchRows);
  await w('matchParticipant', partRows);
  await w('matchResult', resultRows);
  await w('fixture', fixtureRows);
  await w('standing', standingRows);
  await w('leagueAward', awardRows);
  await w('conversation', convRows);
  await w('conversationParticipant', convPartRows);
  await w('message', msgRows);
  await w('tournament', tournamentRows);
  await w('tournamentEntry', tEntryRows);
  await w('tournamentRound', tRoundRows);
  await w('tournamentFixture', tFixtureRows);
  await w('ladder', ladderRows);
  await w('ladderEntry', ladderEntryRows);
  await w('connection', connRows);
  await w('practiceSession', practiceRows);
  await w('goal', goalRows);
  await w('goalMilestone', milestoneRows);
  await w('savedStory', savedRows);
  await w('notification', notifs);
  await w('billingAccount', [billing.account]);
  await w('paymentMethod', [paymentMethodRow]);
  await w('billingSubscription', [subscriptionRow]);
  await w('billingInvoice', invoiceRows);
  await w('paymentTransaction', txnRows);
  await w('clubAuditLog', auditRows);

  console.log('\nRows written:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(26)} ${v}`);
  const ds = specs.filter((s) => [...s.a, ...s.b].includes(demoPlayer.id));
  console.log(`\nDemo player: ${ds.length} matches, final singles rating ${Math.round((singles.get(demoPlayer.id) ?? demoPlayer.level) * 100) / 100} (started ${demoPlayer.level})`);

  console.log('\n----------------------------------------------------------');
  console.log(' Demo logins (shown once — set DEMO_*_PASSWORD to fix them)');
  console.log(`  Player (mobile app):  ${demoPlayer.email}  /  ${playerPassword}`);
  console.log(`  Club owner (console): ${owner.email}  /  ${ownerPassword}`);
  console.log('----------------------------------------------------------');
}

/** Circle-method round robin: returns rounds of [a, b] pairs (n even). */
function circleRounds(ids) {
  const n = ids.length;
  const arr = [...ids];
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) pairs.push([arr[i], arr[n - 1 - i]]);
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

// -------------------------------------------------------------------- main

try {
  await resetDemo();
  if (!RESET_ONLY) await build();
  else log('reset complete.');
} catch (e) {
  console.error('\nFAILED:', e);
  console.error('The demo data may be partially written. Re-run to rebuild from scratch, or use --reset.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
