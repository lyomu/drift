/**
 * Resumes seed-demo-content.mjs for just the pieces that failed on the
 * first run (league/season registration-timing bug + platform-admin auth)
 * without re-running the account/match/connection creation, which would
 * duplicate data. See seed-demo-content.mjs for the full picture.
 */
import {
  ROSTER,
  signupOrLogin,
  api,
  step,
  sleep,
  findRiversideClub,
  createDisputeSeason,
  driveDisputeSeason,
  createActiveLeague,
  driveActiveLeague,
  platformAdminLogin,
  seedPlatformAdmin,
} from './seed-demo-content.mjs';

const DEMO_PASSWORD = 'DriftDemo123!';
const log = (m) => console.log(`[resume] ${m}`);

async function main() {
  log('Re-logging in existing demo roster...');
  const people = {};
  for (const p of ROSTER) {
    const { token } = await signupOrLogin(p.email, DEMO_PASSWORD);
    const me = await api('get', '/users/me', token);
    people[p.key] = { ...p, token, id: me.id };
  }

  const ownerToken = await step('club-admin login', () =>
    api('post', '/auth/login', null, {
      email: 'owner@drift.test',
      password: 'Password123!',
    }).then((r) => r.accessToken),
  );
  if (ownerToken) {
    const clubId = await step('locate Riverside Tennis Club', () =>
      findRiversideClub(ownerToken),
    );
    const disputeSeason = await createDisputeSeason(people, ownerToken, clubId);
    const activeLeague = await createActiveLeague(people, ownerToken, clubId);

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
  }

  const adminToken = await step('platform-admin login (with 2FA)', () =>
    platformAdminLogin('review@drift.local', 'DriftReview2026'),
  );
  if (adminToken) {
    await seedPlatformAdmin(people, adminToken);
  }

  log('done.');
}

main().catch((e) => {
  console.error('[resume] FATAL', e);
  process.exit(1);
});
