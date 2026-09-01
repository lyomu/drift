/**
 * Fills the platform with realistic, memorable demo content across all
 * three surfaces — mobile app, Club Admin, Platform Admin — for manual
 * testing. Everything is created through the real APIs (not raw SQL),
 * except where noted, so it respects the same state-machine invariants a
 * real user would.
 *
 * Prereqs: backend on :3009 (npm run start:dev), Postgres up.
 * Run:     node scripts/seed-demo-content.mjs
 *
 * Safe to re-run: account creation falls back to login if the email
 * already exists (and skips onboarding, assuming a prior run did it).
 * Everything downstream best-efforts — a failed step logs and the script
 * continues, so a partial re-run doesn't hard-stop on "already exists"
 * conflicts from a previous pass.
 */

const BASE = process.env.DRIFT_API_BASE ?? 'http://localhost:3009';
const DEMO_PASSWORD = 'DriftDemo123!';

const log = (m) => console.log(`[seed] ${m}`);
const warn = (m) => console.warn(`[seed] ! ${m}`);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function api(method, path, token, body, retriesLeft = 6) {
  const res = await fetch(`${BASE}${path}`, {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (res.status === 429 && retriesLeft > 0) {
    const waitMs = 12_000;
    warn(`429 on ${method.toUpperCase()} ${path} — waiting ${waitMs / 1000}s and retrying (${retriesLeft} left)`);
    await sleep(waitMs);
    return api(method, path, token, body, retriesLeft - 1);
  }
  if (!res.ok) {
    const err = new Error(
      `${method.toUpperCase()} ${path} -> ${res.status}: ${JSON.stringify(json)}`,
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export async function step(label, fn) {
  try {
    const result = await fn();
    log(`ok — ${label}`);
    return result;
  } catch (e) {
    warn(`SKIPPED — ${label}: ${e.message}`);
    return null;
  }
}

// ------------------------------------------------------------- accounts

export async function signupOrLogin(email, password) {
  try {
    const signup = await api('post', '/auth/signup', null, { email, password });
    const verify = await api('post', '/auth/verify', null, {
      email,
      code: signup.devVerificationCode,
    });
    return { token: verify.accessToken, isNew: true };
  } catch (e) {
    if (e.status === 409 || e.status === 400) {
      const login = await api('post', '/auth/login', null, { email, password });
      return { token: login.accessToken, isNew: false };
    }
    throw e;
  }
}

async function onboard(token, p) {
  await api('patch', '/users/me/basic-profile', token, {
    firstName: p.firstName,
    lastName: p.lastName,
    dominantHand: p.dominantHand,
  });
  await api('patch', '/users/me/tennis-experience', token, {
    experienceSignal: p.experienceSignal,
  });

  const start = await api('post', '/assessment/sessions', token, {});
  let next = start.nextQuestion;
  const sessionId = start.sessionId;
  while (next) {
    const ans = await api(
      'post',
      `/assessment/sessions/${sessionId}/answers`,
      token,
      { questionId: next.questionId, selectedOption: 'D' },
    );
    next = ans.nextQuestion ?? null;
  }

  await api('patch', '/users/me/level', token, {
    userSelectedLevel: p.userSelectedLevel,
  });
  await api('patch', '/users/me/goals', token, { goals: p.goals });
  await api('patch', '/users/me/preferences', token, {
    formatPreference: p.formatPreference,
    stylePreference: p.stylePreference,
    preferredTimeSlots: p.preferredTimeSlots,
  });
  await api('patch', '/users/me/location', token, {
    generalLocation: p.generalLocation,
    latitude: p.latitude,
    longitude: p.longitude,
    locationSource: 'MANUAL',
  });
  await api('patch', '/users/me/club-courts', token, {});
  await api('patch', '/users/me/availability', token, { slots: p.slots });
  await api('patch', '/users/me/padel-interest', token, {
    padelInterest: p.padelInterest,
  });
}

export const ROSTER = [
  {
    key: 'ana',
    email: 'ana.demo@drift.test',
    firstName: 'Ana',
    lastName: 'Ricci',
    dominantHand: 'RIGHT',
    experienceSignal: 'COMPETITIVE',
    userSelectedLevel: 6.0,
    goals: ['play_more', 'win_matches'],
    formatPreference: 'SINGLES',
    stylePreference: 'COMPETITIVE',
    preferredTimeSlots: ['EVENING'],
    generalLocation: 'Clapham, London',
    latitude: 51.4618,
    longitude: -0.1479,
    slots: [
      { dayOfWeek: 0, timeBlock: 'EVENING' },
      { dayOfWeek: 3, timeBlock: 'EVENING' },
      { dayOfWeek: 5, timeBlock: 'MORNING' },
    ],
    padelInterest: 'YES',
  },
  {
    key: 'ben',
    email: 'ben.demo@drift.test',
    firstName: 'Ben',
    lastName: 'Osei',
    dominantHand: 'RIGHT',
    experienceSignal: 'TWO_TO_5Y',
    userSelectedLevel: 4.5,
    goals: ['improve_technique'],
    formatPreference: 'EITHER',
    stylePreference: 'SOCIAL',
    preferredTimeSlots: ['EVENING'],
    generalLocation: 'Islington, London',
    latitude: 51.5416,
    longitude: -0.1022,
    slots: [
      { dayOfWeek: 1, timeBlock: 'EVENING' },
      { dayOfWeek: 6, timeBlock: 'AFTERNOON' },
    ],
    padelInterest: 'NO',
  },
  {
    key: 'carla',
    email: 'carla.demo@drift.test',
    firstName: 'Carla',
    lastName: 'Novak',
    dominantHand: 'LEFT',
    experienceSignal: 'FIVE_PLUS',
    userSelectedLevel: 5.5,
    goals: ['win_matches', 'meet_people'],
    formatPreference: 'SINGLES',
    stylePreference: 'COMPETITIVE',
    preferredTimeSlots: ['EVENING'],
    generalLocation: 'Wimbledon, London',
    latitude: 51.4351,
    longitude: -0.214,
    slots: [
      { dayOfWeek: 2, timeBlock: 'EVENING' },
      { dayOfWeek: 4, timeBlock: 'EVENING' },
    ],
    padelInterest: 'NO',
  },
  {
    key: 'diego',
    email: 'diego.demo@drift.test',
    firstName: 'Diego',
    lastName: 'Fernandez',
    dominantHand: 'RIGHT',
    experienceSignal: 'ONE_TO_2Y',
    userSelectedLevel: 4.0,
    goals: ['play_more'],
    formatPreference: 'DOUBLES',
    stylePreference: 'SOCIAL',
    preferredTimeSlots: ['MORNING', 'AFTERNOON'],
    generalLocation: 'Battersea, London',
    latitude: 51.4791,
    longitude: -0.1567,
    slots: [
      { dayOfWeek: 6, timeBlock: 'MORNING' },
      { dayOfWeek: 0, timeBlock: 'AFTERNOON' },
    ],
    padelInterest: 'NO',
  },
  {
    key: 'emma',
    email: 'emma.demo@drift.test',
    firstName: 'Emma',
    lastName: 'Clarke',
    dominantHand: 'RIGHT',
    experienceSignal: 'UNDER_6M',
    userSelectedLevel: 2.5,
    goals: ['improve_technique', 'meet_people'],
    formatPreference: 'EITHER',
    stylePreference: 'SOCIAL',
    preferredTimeSlots: ['EVENING'],
    generalLocation: "Regent's Park, London",
    latitude: 51.5313,
    longitude: -0.157,
    slots: [{ dayOfWeek: 3, timeBlock: 'EVENING' }],
    padelInterest: 'WANT_TO_LEARN',
  },
  {
    key: 'finn',
    email: 'finn.demo@drift.test',
    firstName: 'Finn',
    lastName: 'Walsh',
    dominantHand: 'RIGHT',
    experienceSignal: 'COMPETITIVE',
    userSelectedLevel: 6.5,
    goals: ['win_matches'],
    formatPreference: 'SINGLES',
    stylePreference: 'COMPETITIVE',
    preferredTimeSlots: ['AFTERNOON'],
    generalLocation: 'Highbury, London',
    latitude: 51.5486,
    longitude: -0.0996,
    slots: [
      { dayOfWeek: 5, timeBlock: 'AFTERNOON' },
      { dayOfWeek: 6, timeBlock: 'AFTERNOON' },
    ],
    padelInterest: 'YES',
  },
];

async function buildRoster() {
  const people = {};
  for (const p of ROSTER) {
    const { token } = await signupOrLogin(p.email, DEMO_PASSWORD);
    const me = await api('get', '/users/me', token);
    if (me.onboardingStep !== 'COMPLETE') {
      try {
        await onboard(token, p);
        log(`onboarded ${p.email} (was at step ${me.onboardingStep})`);
      } catch (e) {
        warn(`onboarding failed for ${p.email}: ${e.message} — will need a manual retry`);
      }
    } else {
      log(`${p.email} already fully onboarded — reusing`);
    }
    people[p.key] = { ...p, token, id: me.id };
  }
  return people;
}

// -------------------------------------------------------- social graph

async function seedConnections(people) {
  // Carla -> Ana, left pending (PENDING_CONNECTION card for Ana).
  await step('connection: Carla -> Ana (pending)', async () => {
    await api('post', '/connections', people.carla.token, {
      addresseeId: people.ana.id,
    });
  });

  // Diego <-> Ana, accepted.
  await step('connection: Diego <-> Ana (accepted)', async () => {
    const req = await api('post', '/connections', people.diego.token, {
      addresseeId: people.ana.id,
    });
    await api('patch', `/connections/${req.id}/accept`, people.ana.token);
  });

  // Ben <-> Ana, accepted (also needed so their challenge/message thread
  // reads naturally in the UI).
  await step('connection: Ben <-> Ana (accepted)', async () => {
    const req = await api('post', '/connections', people.ben.token, {
      addresseeId: people.ana.id,
    });
    await api('patch', `/connections/${req.id}/accept`, people.ana.token);
  });
}

async function scheduleMatch(challengerToken, opponentToken, opts) {
  const created = await api('post', '/matches', challengerToken, {
    opponentId: opts.opponentId,
    format: 'SINGLES',
    sport: 'TENNIS',
    note: opts.note,
  });
  await api('patch', `/matches/${created.id}/accept`, opponentToken, {});
  const proposed = await api(
    'post',
    `/matches/${created.id}/proposals`,
    challengerToken,
    { options: [opts.startsAt] },
  );
  const optionId = proposed.latestProposal.options[0].id;
  const scheduled = await api(
    'patch',
    `/matches/${created.id}/proposals/accept`,
    opponentToken,
    { optionId },
  );
  return scheduled;
}

export function futureIso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

async function seedMatches(people) {
  // 1. INCOMING_CHALLENGE for Ana — Ben challenges her, left unaccepted.
  await step('match: Ben -> Ana challenge (unaccepted)', async () => {
    await api('post', '/matches', people.ben.token, {
      opponentId: people.ana.id,
      format: 'SINGLES',
      sport: 'TENNIS',
      note: 'Fancy a match this week?',
    });
  });

  // 2. UPCOMING_MATCH for Ana — Ana vs Carla, genuinely in the future,
  // with a real court suggested. Nothing submitted — stays SCHEDULED.
  await step('match: Ana vs Carla (upcoming, court suggested)', async () => {
    const m = await scheduleMatch(people.ana.token, people.carla.token, {
      opponentId: people.carla.id,
      note: 'Rematch from last season?',
      startsAt: futureIso(4 * 24 * 60), // 4 days out
    });
    await api('patch', `/matches/${m.id}/court`, people.ana.token, {
      courtName: 'Vauxhall Park Tennis Courts',
      courtId: 'seed-court-vauxhall-tennis',
    });
  });

  // 3. UNCONFIRMED_RESULT for Ana — Ana vs Diego, Diego submits, Ana never
  // confirms.
  await step('match: Ana vs Diego (unconfirmed result)', async () => {
    const m = await scheduleMatch(people.ana.token, people.diego.token, {
      opponentId: people.diego.id,
      note: 'Quick singles set?',
      startsAt: futureIso(2),
    });
    await api('post', `/matches/${m.id}/results`, people.diego.token, {
      outcome: 'SCORE',
      sets: [
        { sideAGames: 4, sideBGames: 6 },
        { sideAGames: 3, sideBGames: 6 },
      ],
    });
  });

  // 4. Real completed history + rating change — Ana vs Emma, submitted and
  // confirmed.
  await step('match: Ana vs Emma (completed, rating change)', async () => {
    const m = await scheduleMatch(people.ana.token, people.emma.token, {
      opponentId: people.emma.id,
      note: 'Good luck!',
      startsAt: futureIso(3),
    });
    await api('post', `/matches/${m.id}/results`, people.ana.token, {
      outcome: 'SCORE',
      sets: [
        { sideAGames: 6, sideBGames: 2 },
        { sideAGames: 6, sideBGames: 4 },
      ],
    });
    await api('patch', `/matches/${m.id}/results/confirm`, people.emma.token);
  });

  // 5. A genuine DISPUTED match — Ana vs Finn, conflicting scores.
  await step('match: Ana vs Finn (disputed)', async () => {
    const m = await scheduleMatch(people.ana.token, people.finn.token, {
      opponentId: people.finn.id,
      note: 'Should be a good one.',
      startsAt: futureIso(2),
    });
    await api('post', `/matches/${m.id}/results`, people.ana.token, {
      outcome: 'SCORE',
      sets: [
        { sideAGames: 6, sideBGames: 3 },
        { sideAGames: 6, sideBGames: 4 },
      ],
    });
    await api('patch', `/matches/${m.id}/results/dispute`, people.finn.token, {
      outcome: 'SCORE',
      sets: [
        { sideAGames: 3, sideBGames: 6 },
        { sideAGames: 4, sideBGames: 6 },
      ],
    });
  });
}

async function seedMessages(people) {
  await step('messages: Ben <-> Ana unread thread', async () => {
    const list = await api('get', '/conversations', people.ana.token);
    const withBen = list.conversations.find((c) =>
      (c.participants ?? []).some((p) => p.id === people.ben.id),
    );
    if (!withBen) throw new Error('no conversation with Ben found');
    await api('post', `/conversations/${withBen.id}/messages`, people.ben.token, {
      body: 'Hey! Still up for that match this week?',
    });
    await api('post', `/conversations/${withBen.id}/messages`, people.ben.token, {
      body: 'Let me know what evening works.',
    });
    // Left unread on purpose — UNREAD_MESSAGES card for Ana.
  });
}

async function seedLearning(people) {
  await step('practice sessions + goal for Ana', async () => {
    await api('post', '/learning/practice-sessions', people.ana.token, {
      occurredAt: futureIso(-2 * 24 * 60),
      durationMinutes: 45,
      skillFocus: 'SERVE',
      perceivedPerformance: 4,
      notes: 'Worked on toss consistency.',
    });
    await api('post', '/learning/practice-sessions', people.ana.token, {
      occurredAt: futureIso(-1 * 24 * 60),
      durationMinutes: 30,
      skillFocus: 'NET_PLAY',
      perceivedPerformance: 3,
    });
    await api('post', '/learning/goals', people.ana.token, {
      skill: 'SERVE',
      target: 5.5,
      deadline: futureIso(60 * 24 * 60),
      milestones: ['Consistent toss', 'First-serve % above 60'],
    });
  });
}

async function seedPadel(people) {
  await step('padel profile: Ana', async () => {
    await api('post', '/padel/profile', people.ana.token);
  });
  await step('padel profile: Finn', async () => {
    await api('post', '/padel/profile', people.finn.token);
  });
}

// ------------------------------------------------------------- club admin

export async function findRiversideClub(ownerToken) {
  const res = await api('get', '/clubs/me/memberships', ownerToken);
  const riverside = res.memberships.find(
    (m) => m.clubName === 'Riverside Tennis Club',
  );
  if (!riverside) throw new Error('Riverside Tennis Club membership not found');
  return riverside.clubId;
}

async function seedClubAdmin(people, ownerToken) {
  const clubId = await step('locate Riverside Tennis Club', () =>
    findRiversideClub(ownerToken),
  );
  if (!clubId) return null;

  await step('invite Carla as COACH', async () => {
    await api('post', `/clubs/${clubId}/members`, ownerToken, {
      email: people.carla.email,
      role: 'COACH',
    });
  });
  await step('invite Diego as CONTENT_MANAGER', async () => {
    await api('post', `/clubs/${clubId}/members`, ownerToken, {
      email: people.diego.email,
      role: 'CONTENT_MANAGER',
    });
  });

  await step('publish a fresh announcement', async () => {
    await api('post', `/clubs/${clubId}/announcements`, ownerToken, {
      title: 'New Autumn Singles season now open',
      body: 'Registration is open for the new season — sign up from the League tab. Round 1 pairings go out once registration closes.',
      pinned: false,
      status: 'PUBLISHED',
    });
  });
  await step('save a draft announcement', async () => {
    await api('post', `/clubs/${clubId}/announcements`, ownerToken, {
      title: 'Clubhouse resurfacing — draft, not yet published',
      body: "Draft: courts 3-4 closed for resurfacing the week of [DATE]. Confirm dates before publishing.",
      pinned: false,
      status: 'DRAFT',
    });
  });

  await step('claim the independent Highbury Fields Courts', async () => {
    await api(
      'patch',
      `/clubs/${clubId}/courts/seed-court-highbury-club/claim`,
      ownerToken,
    );
  });
  await step('add a new club court', async () => {
    await api('post', `/clubs/${clubId}/courts`, ownerToken, {
      name: 'Riverside Court 2 (Indoor)',
      address: 'Riverside Tennis Club grounds',
      latitude: 51.478,
      longitude: -0.15,
      courtGroups: [
        { surface: 'HARD', indoor: true, lighting: true, count: 2 },
      ],
    });
  });

  return clubId;
}

/** A short league+season for club-admin/platform-admin dispute testing —
 * exactly 2 registered players so round-robin pairing is deterministic.
 * Registration is genuinely open at creation time (required by the
 * register endpoint) and closes shortly after; the caller must wait past
 * `readyAt` before querying the round, which lazily opens it. */
export async function createDisputeSeason(people, ownerToken, clubId) {
  if (!clubId) return null;

  // M15 — a league is a single competition run; scheduling lives on the
  // league row directly, no separate season resource.
  const league = await step('create dispute league (registration open now)', () =>
    api('post', `/clubs/${clubId}/leagues`, ownerToken, {
      name: 'Riverside Head-to-Head Demo',
      description: 'Two-player demo league for exercising the dispute queue.',
      sport: 'TENNIS',
      format: 'SINGLES',
      registrationOpensAt: futureIso(-1),
      registrationClosesAt: futureIso(2),
      startsAt: futureIso(2.5),
      roundCount: 1,
      roundIntervalMinutes: 3 * 24 * 60, // 3-day deadline once open
    }),
  );
  if (!league) return null;

  await step('register Ana + Ben in the demo dispute league', async () => {
    await api('post', `/leagues/${league.id}/register`, people.ana.token);
    await api('post', `/leagues/${league.id}/register`, people.ben.token);
  });

  return { seasonId: league.id, readyAt: Date.now() + 2.5 * 60_000 };
}

export async function driveDisputeSeason(people, seasonId) {
  if (!seasonId) return;

  const round = await step('open round 1 (lazy progression)', () =>
    api('get', `/leagues/${seasonId}/rounds/current`, people.ana.token),
  );
  const fixture = round?.round?.fixtures?.[0];
  if (!fixture?.match) {
    warn('no fixture match found — skipping fixture dispute seed');
    return;
  }

  const matchId = fixture.match.id;
  const sideAUserId = fixture.sideA.id;
  const [p1, p2] = [people.ana, people.ben];
  const sideAToken = sideAUserId === p1.id ? p1.token : p2.token;
  const sideBToken = sideAUserId === p1.id ? p2.token : p1.token;

  await step('schedule the fixture match', async () => {
    const proposed = await api(
      'post',
      `/matches/${matchId}/proposals`,
      sideAToken,
      { options: [futureIso(2)] },
    );
    const optionId = proposed.latestProposal.options[0].id;
    await api('patch', `/matches/${matchId}/proposals/accept`, sideBToken, {
      optionId,
    });
  });

  await step('submit + dispute the fixture result (real dispute queue item)', async () => {
    await api('post', `/matches/${matchId}/results`, sideAToken, {
      outcome: 'SCORE',
      sets: [
        { sideAGames: 6, sideBGames: 1 },
        { sideAGames: 6, sideBGames: 2 },
      ],
    });
    await api('patch', `/matches/${matchId}/results/dispute`, sideBToken, {
      outcome: 'SCORE',
      sets: [
        { sideAGames: 1, sideBGames: 6 },
        { sideAGames: 2, sideBGames: 6 },
      ],
    });
  });

  log('demo dispute league is live — shows in club-admin and platform-admin dispute queues');
}

/** A separate, longer-running league — registration genuinely open, so
 * club-admin has something to manage and Ana's Home feed gets a real
 * LEAGUE_ROUND_DEADLINE card once she registers and the round opens. */
export async function createActiveLeague(people, ownerToken, clubId) {
  if (!clubId) return null;

  const league = await step('create Riverside Autumn Singles league (registration open now)', () =>
    api('post', `/clubs/${clubId}/leagues`, ownerToken, {
      name: 'Riverside Autumn Singles',
      description: 'Friendly round-robin singles — register, get paired, climb the standings.',
      sport: 'TENNIS',
      format: 'SINGLES',
      registrationOpensAt: futureIso(-1),
      registrationClosesAt: futureIso(2),
      startsAt: futureIso(2.5),
      roundCount: 3,
      roundIntervalMinutes: 3 * 24 * 60,
    }),
  );
  if (!league) return null;

  await step('register Ana, Carla, Diego, Emma', async () => {
    for (const key of ['ana', 'carla', 'diego', 'emma']) {
      await api('post', `/leagues/${league.id}/register`, people[key].token);
    }
  });

  return { seasonId: league.id, readyAt: Date.now() + 2.5 * 60_000 };
}

export async function driveActiveLeague(people, seasonId) {
  if (!seasonId) return;
  await step('open round 1 (lazy progression)', () =>
    api('get', `/leagues/${seasonId}/rounds/current`, people.ana.token),
  );
  log('Riverside Autumn Singles is active — Ana should see a LEAGUE_ROUND_DEADLINE card');
}

async function seedCourtReport(people, clubId) {
  await step('court report against a Riverside court (club + platform reports queue)', async () => {
    await api('post', '/courts/e8e31cc2-6f49-4a97-b74c-4149c6fa1733/report', people.ben.token, {
      reason: 'INCORRECT_INFO',
      notes: 'Address listed is out of date — club moved courts last year.',
    });
  });
}

// -------------------------------------------------------- platform admin

export async function platformAdminLogin(email, password) {
  const login = await api('post', '/platform-admin/auth/login', null, {
    email,
    password,
  });
  if (!login.requiresTwoFactor) return login.accessToken;
  const verify = await api('post', '/platform-admin/auth/verify-2fa', null, {
    challengeToken: login.challengeToken,
    code: login.devVerificationCode,
  });
  return verify.accessToken;
}

export async function seedPlatformAdmin(people, adminToken) {
  await step('create a pending news source', async () => {
    await api('post', '/platform-admin/news/sources', adminToken, {
      name: 'Local Courts Weekly',
      status: 'ACTIVE',
    });
  });

  await step('support ticket: billing, urgent', async () => {
    await api('post', '/platform-admin/support/tickets', adminToken, {
      userId: people.ana.id,
      subject: "Charged twice for this month's club fee",
      body: 'I see two identical charges on my card for the Riverside membership this month — can you check and refund the duplicate?',
      category: 'BILLING',
      priority: 'URGENT',
    });
  });
  await step('support ticket: technical, normal', async () => {
    await api('post', '/platform-admin/support/tickets', adminToken, {
      userId: people.emma.id,
      subject: 'App crashes when opening Match History',
      body: 'Every time I tap Match History from my profile the app closes. Happens every time, on Android.',
      category: 'TECHNICAL',
      priority: 'NORMAL',
    });
  });

  await step('privacy request: export (safe to process)', async () => {
    await api('post', '/platform-admin/support/privacy-requests', adminToken, {
      userId: people.ana.id,
      type: 'EXPORT',
      requestNote: 'User requested a copy of their data via support chat.',
    });
  });
}

async function seedPlayerReport(people) {
  await step('open player report (safety queue)', async () => {
    await api('post', '/safety/reports', people.carla.token, {
      reportedUserId: people.finn.id,
      reason: 'INAPPROPRIATE_CONTENT',
      notes: 'Inappropriate message sent after a scheduling disagreement.',
    });
  });
}

// ------------------------------------------------------------------ main

async function main() {
  log('Building player roster (6 accounts, shared password: ' + DEMO_PASSWORD + ')...');
  const people = await buildRoster();

  log('Seeding social graph (connections, matches, messages, learning, padel)...');
  await seedConnections(people);
  await seedMatches(people);
  await seedMessages(people);
  await seedLearning(people);
  await seedPadel(people);
  await seedPlayerReport(people);

  log('Logging in club owner (owner@drift.test)...');
  const ownerToken = await step('club-admin login', () =>
    api('post', '/auth/login', null, {
      email: 'owner@drift.test',
      password: 'Password123!',
    }).then((r) => r.accessToken),
  );
  if (ownerToken) {
    const clubId = await seedClubAdmin(people, ownerToken);
    const disputeSeason = await createDisputeSeason(people, ownerToken, clubId);
    const activeLeague = await createActiveLeague(people, ownerToken, clubId);
    await seedCourtReport(people, clubId);

    const readyAt = Math.max(
      disputeSeason?.readyAt ?? 0,
      activeLeague?.readyAt ?? 0,
    );
    if (readyAt > Date.now()) {
      const waitMs = readyAt - Date.now() + 5_000;
      log(`waiting ${Math.round(waitMs / 1000)}s for both seasons' start times to pass...`);
      await sleep(waitMs);
    }
    await driveDisputeSeason(people, disputeSeason?.seasonId);
    await driveActiveLeague(people, activeLeague?.seasonId);
  } else {
    warn('could not log in as owner@drift.test — club-admin seeding skipped entirely');
  }

  log('Logging in platform admin (review@drift.local)...');
  const adminToken = await step('platform-admin login (with 2FA)', () =>
    platformAdminLogin('review@drift.local', 'DriftReview2026'),
  );
  if (adminToken) {
    await seedPlatformAdmin(people, adminToken);
  } else {
    warn('could not log in as review@drift.local — platform-admin seeding skipped entirely');
  }

  console.log('\n========================================================');
  console.log('DEMO ACCOUNTS');
  console.log('========================================================');
  console.log(`Mobile app (password for all: ${DEMO_PASSWORD})`);
  for (const p of ROSTER) {
    console.log(`  ${p.email.padEnd(24)} ${p.firstName} ${p.lastName} — level ${p.userSelectedLevel}, ${p.generalLocation}`);
  }
  console.log('  -> log in as ana.demo@drift.test for the fullest Home feed:');
  console.log('     incoming challenge, upcoming match, unconfirmed result,');
  console.log('     disputed match, completed history, pending connection,');
  console.log('     unread messages, league registration, padel profile.');
  console.log('\nClub Admin: owner@drift.test / Password123! (Riverside Tennis Club)');
  console.log('Platform Admin: review@drift.local / DriftReview2026 (2FA: dev console code)');
  console.log('========================================================');
}

import { pathToFileURL } from 'node:url';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('[seed] FATAL', e);
    process.exit(1);
  });
}
