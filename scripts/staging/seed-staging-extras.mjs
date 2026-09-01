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
  const tournament = await step('create tournament (8-player draw)', () =>
    api('post', `/clubs/${clubId}/tournaments`, ownerToken, {
      name: 'Riverside Autumn Open',
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
  const ladder = await step('create ladder', () =>
    api('post', `/clubs/${clubId}/ladders`, ownerToken, {
      name: 'Riverside Singles Ladder',
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
  const plan = await step('payment plan: Club Pro (monthly)', () =>
    api('post', '/platform-admin/plans', token, {
      code: 'CLUB_PRO_MONTHLY',
      name: 'Club Pro',
      description: 'Full club management: unlimited members, leagues, courts and events.',
      audience: 'CLUB',
      priceMinor: 4900,
      currency: 'GBP',
      interval: 'MONTHLY',
      entitlements: ['unlimited_members', 'leagues', 'events', 'court_management'],
    }),
  );
  await step('payment plan: Player Plus (yearly)', () =>
    api('post', '/platform-admin/plans', token, {
      code: 'PLAYER_PLUS_YEARLY',
      name: 'Player Plus',
      description: 'Advanced stats, unlimited match history and priority matchmaking.',
      audience: 'PLAYER',
      priceMinor: 2900,
      currency: 'GBP',
      interval: 'YEARLY',
      entitlements: ['advanced_stats', 'priority_matchmaking'],
    }),
  );
  await step('promotion: launch discount', () =>
    api('post', '/platform-admin/promotions', token, {
      code: 'AUTUMN25',
      description: '25% off the first three months of any club plan.',
      discountPercent: 25,
      expiresAt: daysFromNow(45),
    }),
  );
  await step('sponsor: kit partner', () =>
    api('post', '/platform-admin/sponsors', token, {
      name: 'Baseline Sportswear',
      description: 'Official kit partner — club discounts and tournament prizes.',
      websiteUrl: 'https://example.com/baseline',
    }),
  );
  return plan;
}

async function seedSupport(token, people) {
  await step('support ticket: billing, urgent', () =>
    api('post', '/platform-admin/tickets', token, {
      userId: people.ana.id,
      subject: "Charged twice for this month's club fee",
      body: 'Two identical charges appeared on my card for the Riverside membership this month — can you refund the duplicate?',
      category: 'BILLING',
      priority: 'URGENT',
    }),
  );
  await step('support ticket: technical, normal', () =>
    api('post', '/platform-admin/tickets', token, {
      userId: people.ben.id,
      subject: 'Match result will not submit',
      body: 'Tapping "submit result" spins and then returns me to the match screen with nothing saved.',
      category: 'TECHNICAL',
      priority: 'NORMAL',
    }),
  );
  await step('privacy request: data export', () =>
    api('post', '/platform-admin/privacy-requests', token, {
      userId: people.carla.id,
      type: 'EXPORT',
    }),
  );
}

async function seedSettings(token) {
  await step('feature flag: padel rollout', () =>
    api('post', '/platform-admin/feature-flags', token, {
      key: 'padel_booking',
      description: 'Enables padel court booking in the mobile app.',
      enabled: false,
    }),
  );
  await step('feature flag: coach marketplace', () =>
    api('post', '/platform-admin/feature-flags', token, {
      key: 'coach_marketplace',
      description: 'Public coach directory and booking links.',
      enabled: true,
    }),
  );
  await step('market: United Kingdom', () =>
    api('post', '/platform-admin/markets', token, {
      name: 'United Kingdom',
      countryCode: 'GB',
      currency: 'GBP',
      status: 'ACTIVE',
    }),
  );
  await step('market: Kenya (pilot)', () =>
    api('post', '/platform-admin/markets', token, {
      name: 'Kenya',
      countryCode: 'KE',
      currency: 'KES',
      status: 'PENDING',
    }),
  );
}

async function seedAbuseAndRulesets(token, people) {
  await step('abuse case', () =>
    api('post', '/platform-admin/abuse-cases', token, {
      subjectUserId: people.finn.id,
      summary: 'Multiple harassment reports from separate players within one week.',
    }),
  );
  await step('competition ruleset', () =>
    api('post', '/platform-admin/rulesets', token, {
      name: 'Standard Singles (best of 3)',
      description: 'Best of three tie-break sets, third set a championship tie-break.',
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
