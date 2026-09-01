/**
 * Fills the staging sections that `prisma/seed.ts` and
 * `backend/scripts/seed-demo-content.mjs` leave empty, so every Club Admin
 * and Platform Admin page has real rows to test against.
 *
 * Two halves, deliberately split by what authentication they need:
 *
 *   1. CLUB + PLAYER half — runs on plain password logins (owner@drift.test
 *      and the demo roster). Needs nothing special.
 *   2. PLATFORM ADMIN half — needs a platform-admin bearer token. Staging is
 *      NODE_ENV=production, so `/platform-admin/auth/login` never returns the
 *      2FA code (see AuthService.devCode / platform-admin.service.ts:338) and
 *      the token cannot be minted from here. Supply one via env:
 *
 *        DRIFT_ADMIN_TOKEN=... node scripts/staging/seed-staging-extras.mjs
 *
 *      To get that token, plant a known 2FA code on the open challenge:
 *        curl -sk -X POST https://135.181.146.130/api/platform-admin/auth/login \
 *          -H 'Content-Type: application/json' \
 *          -d '{"email":"admin@drift.test","password":"DriftPlatform2026!"}'
 *        ssh root@135.181.146.130 \
 *          'docker exec -i -e STAGING_2FA_CODE=424242 drift-api node - \
 *             < /srv/drift/app/scripts/staging/set-2fa-code.mjs'
 *        curl -sk -X POST .../platform-admin/auth/verify-2fa \
 *          -d '{"challengeToken":"<from step 1>","code":"424242"}'
 *
 * Without DRIFT_ADMIN_TOKEN the script still runs half 1 in full and reports
 * exactly which sections it had to skip.
 *
 * Every step is best-effort: a failure logs and the run continues, so a
 * partial re-run never hard-stops on "already exists".
 *
 * Run:
 *   DRIFT_API_BASE=https://135.181.146.130/api node scripts/staging/seed-staging-extras.mjs
 */

const BASE = process.env.DRIFT_API_BASE ?? 'http://localhost:3009';
const ADMIN_TOKEN = process.env.DRIFT_ADMIN_TOKEN ?? '';
const DEMO_PASSWORD = 'DriftDemo123!';
const OWNER = { email: 'owner@drift.test', password: 'Password123!' };
// Used as the natural key for the reuse checks below.
const TOURNAMENT_NAME = 'Riverside Autumn Open';
const LADDER_NAME = 'Riverside Singles Ladder';

const log = (m) => console.log(`[extras] ${m}`);
const warn = (m) => console.warn(`[extras] ! ${m}`);

const skipped = [];
const done = [];

async function api(method, path, token, body, retriesLeft = 4) {
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
  // Auth endpoints are capped at 10 hits per 60s rolling window
  // (AUTH_SENSITIVE in auth.controller.ts). Retrying inside that window just
  // spends more budget, so wait past the full TTL before trying again.
  if (res.status === 429 && retriesLeft > 0) {
    warn(`429 on ${method.toUpperCase()} ${path} — waiting 65s (${retriesLeft} left)`);
    await new Promise((r) => setTimeout(r, 65_000));
    return api(method, path, token, body, retriesLeft - 1);
  }
  if (!res.ok) {
    const err = new Error(
      `${method.toUpperCase()} ${path} -> ${res.status}: ${JSON.stringify(json)}`,
    );
    err.status = res.status;
    throw err;
  }
  return json;
}

async function step(label, fn) {
  try {
    const result = await fn();
    log(`ok — ${label}`);
    done.push(label);
    return result;
  } catch (e) {
    warn(`SKIPPED — ${label}: ${e.message}`);
    skipped.push(label);
    return null;
  }
}

const daysFromNow = (d) => new Date(Date.now() + d * 86_400_000).toISOString();

// --------------------------------------------------------------- logins

async function login(email, password) {
  const r = await api('post', '/auth/login', null, { email, password });
  const me = await api('get', '/users/me', r.accessToken);
  return { token: r.accessToken, id: me.id, email };
}

// ------------------------------------------------------- club + player half

async function seedCourtsAndReports(people, ownerToken, clubId) {
  // The demo seeder 404'd on all three of these because prisma/seed.ts had
  // never run on staging, so the seed-court-* ids did not exist yet.
  const courts = await step('list courts near London', () =>
    api('get', '/courts?latitude=51.5074&longitude=-0.1278&maxDistanceKm=30&take=50', people.ana.token),
  );
  const list = courts?.courts ?? [];
  if (list.length === 0) {
    warn('no courts found — court-dependent steps cannot run');
    return;
  }

  const independent = list.find((c) => !c.clubId) ?? list[0];
  await step(`claim "${independent.name}" for the club`, () =>
    api('patch', `/clubs/${clubId}/courts/${independent.id}/claim`, ownerToken),
  );

  await step('court report: incorrect info (feeds club + platform queues)', () =>
    api('post', `/courts/${list[0].id}/report`, people.ben.token, {
      reason: 'INCORRECT_INFO',
      notes: 'The gate code listed here is out of date — it changed last month.',
    }),
  );
  await step('court report: permanently closed', () =>
    api('post', `/courts/${list[1]?.id ?? list[0].id}/report`, people.carla.token, {
      reason: 'PERMANENTLY_CLOSED',
      notes: 'Courts have been fenced off for redevelopment since the summer.',
    }),
  );

  // Attach a real court to Ana's upcoming match — the one step the demo
  // seeder lost to the missing court rows.
  await step("suggest a court on Ana's upcoming match", async () => {
    const matches = await api('get', '/matches?segment=active', people.ana.token);
    const items = matches.matches ?? matches.items ?? matches;
    // MatchState, not `status` — SCHEDULING covers an accepted challenge that
    // has no agreed time yet, which is exactly where a court suggestion goes.
    const upcoming = (Array.isArray(items) ? items : []).find((m) =>
      ['SCHEDULED', 'SCHEDULING', 'RESCHEDULED'].includes(m.state),
    );
    if (!upcoming) throw new Error('no scheduled match found for Ana');
    return api('patch', `/matches/${upcoming.id}/court`, people.ana.token, {
      courtName: list[0].name,
      courtNote: 'Booked court 3 — meet by the clubhouse gate.',
      courtId: list[0].id,
    });
  });
}

async function seedTournament(people, ownerToken, clubId) {
  // Re-running must not stack duplicates: these endpoints have no natural
  // key, so an existing row with the same name is reused instead.
  const existingT = await api('get', `/clubs/${clubId}/tournaments`, ownerToken)
    .then((r) => (r.tournaments ?? r).find((t) => t.name === TOURNAMENT_NAME))
    .catch(() => null);
  if (existingT) {
    log(`tournament "${TOURNAMENT_NAME}" already exists — reusing`);
    return existingT;
  }

  const tournament = await step('create tournament (8-player draw)', () =>
    api('post', `/clubs/${clubId}/tournaments`, ownerToken, {
      name: TOURNAMENT_NAME,
      description:
        'Single-elimination 8-player draw. Open to club members and guests — winner takes the Riverside Cup.',
      drawSize: 8,
      registrationClosesAt: daysFromNow(2),
    }),
  );
  if (!tournament?.id) return;

  for (const key of ['ana', 'ben', 'carla', 'diego', 'emma', 'finn']) {
    await step(`tournament entry: ${people[key].email}`, () =>
      api('post', `/tournaments/${tournament.id}/entries`, people[key].token),
    );
  }
  // Draw generation needs the entries above, so it runs last.
  await step('generate the tournament draw', () =>
    api('post', `/clubs/${clubId}/tournaments/${tournament.id}/generate-draw`, ownerToken),
  );
  return tournament;
}

async function seedLadder(people, ownerToken, clubId) {
  const existingL = await api('get', `/ladders?clubId=${clubId}`, ownerToken)
    .then((r) => (r.ladders ?? r).find((l) => l.name === LADDER_NAME))
    .catch(() => null);
  if (existingL) {
    log(`ladder "${LADDER_NAME}" already exists — reusing`);
    return existingL;
  }

  const ladder = await step('create ladder', () =>
    api('post', `/clubs/${clubId}/ladders`, ownerToken, {
      name: LADDER_NAME,
      challengeRange: 3,
      sport: 'TENNIS',
    }),
  );
  if (!ladder?.id) return;

  for (const key of ['ana', 'ben', 'carla', 'diego', 'emma']) {
    await step(`ladder entry: ${people[key].email}`, () =>
      api('post', `/ladders/${ladder.id}/entries`, people[key].token),
    );
  }

  // An open challenge and an accepted one, so the ladder has both states.
  const open = await step('ladder challenge: Diego -> Ana (pending)', () =>
    api('post', `/ladders/${ladder.id}/challenges`, people.diego.token, {
      defenderUserId: people.ana.id,
    }),
  );
  const accepted = await step('ladder challenge: Ben -> Ana', () =>
    api('post', `/ladders/${ladder.id}/challenges`, people.ben.token, {
      defenderUserId: people.ana.id,
    }),
  );
  if (accepted?.id) {
    await step('accept the Ben challenge', () =>
      api('post', `/ladders/challenges/${accepted.id}/accept`, people.ana.token),
    );
  }
  void open;
  return ladder;
}

async function seedEvents(ownerToken, clubId) {
  const existingE = await api('get', `/clubs/${clubId}/events`, ownerToken)
    .then((r) => (r.events ?? r).map((e) => e.name))
    .catch(() => []);
  if (existingE.length > 0) {
    log(`${existingE.length} event(s) already exist — skipping event creation`);
    return null;
  }

  await step('event: published club social', () =>
    api('post', `/clubs/${clubId}/events`, ownerToken, {
      name: 'Autumn Club Social & Round Robin',
      description:
        'Informal round-robin followed by drinks in the clubhouse. All levels welcome — bring a guest.',
      startsAt: daysFromNow(6),
      endsAt: daysFromNow(6.2),
      capacity: 24,
      status: 'PUBLISHED',
    }),
  );
  await step('event: draft (unpublished)', () =>
    api('post', `/clubs/${clubId}/events`, ownerToken, {
      name: 'Winter Coaching Intensive',
      description: 'Four-week technical block with the head coach. Dates provisional.',
      startsAt: daysFromNow(30),
      capacity: 12,
      status: 'DRAFT',
    }),
  );
  const past = await step('event: completed (for history)', () =>
    api('post', `/clubs/${clubId}/events`, ownerToken, {
      name: 'Summer Championships Finals Day',
      description: 'Finals across all draws, followed by prize-giving.',
      startsAt: daysFromNow(-14),
      endsAt: daysFromNow(-13.8),
      capacity: 60,
      status: 'COMPLETED',
    }),
  );
  return past;
}

async function seedVerificationRequest(ownerToken, clubId) {
  // Populates the Platform Admin organizations/approvals queue from the
  // club side, without needing an admin token.
  await step('submit club verification request (platform approvals queue)', () =>
    api('post', `/clubs/${clubId}/verification-request`, ownerToken),
  );
}

async function seedSafety(people) {
  await step('player report: harassment (trust & safety queue)', () =>
    api('post', '/safety/reports', people.carla.token, {
      reportedUserId: people.finn.id,
      reason: 'HARASSMENT',
      notes: 'Repeated unwanted messages after I declined a match.',
    }),
  );
  await step('player report: cheating', () =>
    api('post', '/safety/reports', people.emma.token, {
      reportedUserId: people.diego.id,
      reason: 'CHEATING',
      notes: 'Recorded a score we never played and would not correct it.',
    }),
  );
}

// ----------------------------------------------------- platform admin half

async function seedCommercial(token) {
  await step('payment plan: Club Pro (monthly)', () =>
    api('post', '/platform-admin/commercial/plans', token, {
      code: 'CLUB_PRO_MONTHLY',
      name: 'Club Pro',
      description: 'Full club management: unlimited members, leagues, courts and events.',
      audience: 'CLUB',
      priceMinor: 4900,
      currency: 'GBP',
      interval: 'MONTHLY',
      entitlements: ['unlimited_members', 'leagues', 'events', 'court_management'],
      isActive: true,
      sortOrder: 1,
    }),
  );
  await step('payment plan: Player Plus (yearly)', () =>
    api('post', '/platform-admin/commercial/plans', token, {
      code: 'PLAYER_PLUS_YEARLY',
      name: 'Player Plus',
      description: 'Advanced stats, unlimited match history and priority matchmaking.',
      audience: 'PLAYER',
      priceMinor: 2900,
      currency: 'GBP',
      interval: 'YEARLY',
      entitlements: ['advanced_stats', 'priority_matchmaking'],
      isActive: true,
      sortOrder: 2,
    }),
  );
  await step('promotion: autumn percent discount', () =>
    api('post', '/platform-admin/commercial/promotions', token, {
      code: 'AUTUMN25',
      name: 'Autumn launch discount',
      description: '25% off the first three months of any club plan.',
      audience: 'CLUB',
      discountType: 'PERCENT',
      percentOff: 25,
      startsAt: daysFromNow(-1),
      endsAt: daysFromNow(45),
      maxRedemptions: 200,
      isActive: true,
    }),
  );
  await step('promotion: fixed amount off (expired)', () =>
    api('post', '/platform-admin/commercial/promotions', token, {
      code: 'WELCOME10',
      name: 'Welcome credit',
      description: 'GBP 10 off a first Player Plus year.',
      audience: 'PLAYER',
      discountType: 'AMOUNT',
      amountOffMinor: 1000,
      currency: 'GBP',
      startsAt: daysFromNow(-30),
      endsAt: daysFromNow(-2),
      isActive: false,
    }),
  );
  await step('sponsor placement: kit partner (live)', () =>
    api('post', '/platform-admin/commercial/sponsors', token, {
      name: 'Home feed banner - Baseline',
      sponsorName: 'Baseline Sportswear',
      placementKey: 'home_feed_banner',
      destinationUrl: 'https://example.com/baseline',
      startsAt: daysFromNow(-7),
      endsAt: daysFromNow(60),
      isActive: true,
    }),
  );
  await step('sponsor placement: expired', () =>
    api('post', '/platform-admin/commercial/sponsors', token, {
      name: 'Summer series - Courtside Drinks',
      sponsorName: 'Courtside Drinks Co.',
      placementKey: 'competition_header',
      destinationUrl: 'https://example.com/courtside',
      startsAt: daysFromNow(-90),
      endsAt: daysFromNow(-10),
      isActive: false,
    }),
  );
}

async function seedSupport(token, people) {
  await step('support ticket: billing, urgent', () =>
    api('post', '/platform-admin/support/tickets', token, {
      userId: people.ana.id,
      subject: 'Charged twice for this club fee',
      body: 'Two identical charges appeared on my card for the Riverside membership this month - can you refund the duplicate?',
      category: 'BILLING',
      priority: 'URGENT',
    }),
  );
  await step('support ticket: technical, normal', () =>
    api('post', '/platform-admin/support/tickets', token, {
      userId: people.ben.id,
      subject: 'Match result will not submit',
      body: 'Tapping submit result spins and then returns me to the match screen with nothing saved.',
      category: 'TECHNICAL',
      priority: 'NORMAL',
    }),
  );
  await step('support ticket: clubs, high', () =>
    api('post', '/platform-admin/support/tickets', token, {
      userId: people.carla.id,
      subject: 'Cannot leave a club I never joined',
      body: 'My profile lists a club membership I did not request, and there is no way to remove it from the app.',
      category: 'CLUBS',
      priority: 'HIGH',
    }),
  );
  // EXPORT only. A DELETION request is destructive to process, so it is
  // deliberately not seeded against a live demo account.
  await step('privacy request: data export', () =>
    api('post', '/platform-admin/support/privacy-requests', token, {
      userId: people.carla.id,
      type: 'EXPORT',
      requestNote: 'Player asked for a copy of their match and message history.',
    }),
  );
}

async function seedSettings(token) {
  const market = await step('market: London, GB (active)', () =>
    api('post', '/platform-admin/platform-config/markets', token, {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      cityName: 'London',
      timezone: 'Europe/London',
      status: 'ACTIVE',
      notes: 'Launch market - all demo clubs and courts sit here.',
    }),
  );
  await step('market: Nairobi, KE (coming soon)', () =>
    api('post', '/platform-admin/platform-config/markets', token, {
      countryCode: 'KE',
      countryName: 'Kenya',
      cityName: 'Nairobi',
      timezone: 'Africa/Nairobi',
      status: 'COMING_SOON',
      notes: 'Second market under evaluation.',
    }),
  );
  await step('feature flag: padel booking (off)', () =>
    api('post', '/platform-admin/platform-config/feature-flags', token, {
      key: 'padel_booking',
      name: 'Padel court booking',
      description: 'Enables padel court booking in the mobile app.',
      status: 'OFF',
      rolloutPercentage: 0,
    }),
  );
  await step('feature flag: coach marketplace (on)', () =>
    api('post', '/platform-admin/platform-config/feature-flags', token, {
      key: 'coach_marketplace',
      name: 'Coach marketplace',
      description: 'Public coach directory and booking links.',
      status: 'ON',
      rolloutPercentage: 100,
    }),
  );
  await step('feature flag: partial rollout (25%)', () =>
    api('post', '/platform-admin/platform-config/feature-flags', token, {
      key: 'home_feed_v2',
      name: 'Home feed v2',
      description: 'New card ordering and density on the Home feed.',
      status: 'PARTIAL',
      rolloutPercentage: 25,
      ...(market?.id ? { marketId: market.id } : {}),
      cohort: 'beta_testers',
    }),
  );
}

async function seedAbuseAndRulesets(token, people) {
  await step('abuse case: repeat harassment reports', () =>
    api('post', '/platform-admin/trust-safety/abuse-cases', token, {
      subjectUserId: people.finn.id,
      summary:
        'Multiple harassment reports from separate players within one week - needs a consolidated review before any suspension.',
      priority: 'HIGH',
    }),
  );
  await step('competition ruleset: standard singles (default)', () =>
    api('post', '/platform-admin/competitions/rulesets', token, {
      name: 'Standard Singles (best of 3)',
      description: 'Default ruleset for club singles competitions.',
      sport: 'TENNIS',
      format: 'SINGLES',
      competitionTypes: ['LEAGUE', 'TOURNAMENT', 'LADDER'],
      scoringFormat: 'Best of 3 tie-break sets; championship tie-break in the third.',
      walkoverRule: 'A player who does not appear within 15 minutes of the agreed start forfeits the match.',
      unfinishedMatchPolicy: 'An unfinished match is replayed unless both players agree the score stands.',
      isDefault: true,
      isActive: true,
    }),
  );
  await step('competition ruleset: doubles', () =>
    api('post', '/platform-admin/competitions/rulesets', token, {
      name: 'Club Doubles (short sets)',
      description: 'Faster format for club doubles nights.',
      sport: 'TENNIS',
      format: 'DOUBLES',
      competitionTypes: ['LEAGUE'],
      scoringFormat: 'Short sets to 4 games, tie-break at 3-3.',
      walkoverRule: 'A pair missing a player at the agreed start forfeits unless a substitute is agreed.',
      unfinishedMatchPolicy: 'Score at the point of abandonment stands if at least one set is complete.',
      isActive: true,
    }),
  );
}

// ------------------------------------------------------------------ main

async function main() {
  log(`base: ${BASE}`);

  log('Logging in demo roster + club owner...');
  const people = {};
  for (const key of ['ana', 'ben', 'carla', 'diego', 'emma', 'finn']) {
    people[key] = await login(`${key}.demo@drift.test`, DEMO_PASSWORD);
    await new Promise((r) => setTimeout(r, 7_000));
  }
  const owner = await login(OWNER.email, OWNER.password);

  const clubs = await api('get', '/club-admin/clubs', owner.token).catch(() => null);
  const clubId =
    clubs?.clubs?.[0]?.id ??
    clubs?.[0]?.id ??
    (await api('get', '/clubs?search=Riverside Tennis Club', owner.token)
      .then((r) => (r.clubs ?? r).find((c) => c.name === 'Riverside Tennis Club')?.id)
      .catch(() => null));
  if (!clubId) {
    warn('could not resolve the club id — club-scoped steps will all skip');
  } else {
    log(`club: ${clubId}`);
  }

  log('--- club + player sections ---');
  if (clubId) {
    await seedCourtsAndReports(people, owner.token, clubId);
    await seedTournament(people, owner.token, clubId);
    await seedLadder(people, owner.token, clubId);
    await seedEvents(owner.token, clubId);
    await seedVerificationRequest(owner.token, clubId);
  }
  await seedSafety(people);

  log('--- platform admin sections ---');
  if (!ADMIN_TOKEN) {
    warn('DRIFT_ADMIN_TOKEN not set — commercial, support, settings, abuse');
    warn('and rulesets sections skipped. See the header for how to mint one.');
    skipped.push('ALL platform-admin sections (no DRIFT_ADMIN_TOKEN)');
  } else {
    await seedCommercial(ADMIN_TOKEN);
    await seedSupport(ADMIN_TOKEN, people);
    await seedSettings(ADMIN_TOKEN);
    await seedAbuseAndRulesets(ADMIN_TOKEN, people);
  }

  console.log('\n========================================================');
  console.log(`SEEDED ${done.length} items`);
  if (skipped.length) {
    console.log(`SKIPPED ${skipped.length}:`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
  console.log('========================================================');
}

main().catch((e) => {
  console.error('[extras] FATAL', e);
  process.exit(1);
});
