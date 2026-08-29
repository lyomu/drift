import { api, futureIso } from './seed-demo-content.mjs';

const CREDS = {
  ana: { email: 'ana.demo@drift.test', password: 'DriftDemo123!' },
  emma: { email: 'emma.demo@drift.test', password: 'DriftDemo123!' },
  carla: { email: 'carla.demo@drift.test', password: 'DriftDemo123!' },
  diego: { email: 'diego.demo@drift.test', password: 'DriftDemo123!' },
};

async function login(key) {
  const { email, password } = CREDS[key];
  const res = await api('post', '/auth/login', null, { email, password });
  return res.accessToken;
}

async function playFixture(matchId, challengerToken, opponentToken, sets) {
  const proposed = await api('post', `/matches/${matchId}/proposals`, challengerToken, {
    options: [futureIso(2)],
  });
  const optionId = proposed.latestProposal.options[0].id;
  await api('patch', `/matches/${matchId}/proposals/accept`, opponentToken, { optionId });
  await api('post', `/matches/${matchId}/results`, challengerToken, {
    outcome: 'SCORE',
    sets,
  });
  await api('patch', `/matches/${matchId}/results/confirm`, opponentToken);
}

async function main() {
  const tokens = {
    ana: await login('ana'),
    emma: await login('emma'),
    carla: await login('carla'),
    diego: await login('diego'),
  };

  const round = await api(
    'get',
    '/seasons/38e587d2-ec62-4938-a91c-b4dbed0261bd/rounds/current',
    tokens.ana,
  );
  const fixtures = round.round.fixtures;
  console.log('fixtures:', fixtures.map((f) => `${f.sideA.firstName} vs ${f.sideB.firstName} (${f.match.id})`));

  for (const f of fixtures) {
    const aKey = f.sideA.firstName.toLowerCase();
    const bKey = f.sideB.firstName.toLowerCase();
    console.log(`playing ${f.sideA.firstName} vs ${f.sideB.firstName}...`);
    await playFixture(f.match.id, tokens[aKey], tokens[bKey], [
      { sideAGames: 6, sideBGames: 3 },
      { sideAGames: 6, sideBGames: 4 },
    ]);
    console.log('  done');
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
