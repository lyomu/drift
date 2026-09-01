import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface TestUser {
  email: string;
  token: string;
  id: string;
}

/**
 * The §5 competition flow against live Postgres: register into a league,
 * watch Round 1 open automatically once it starts, play the fixture through
 * the (already-e2e-tested) §4.3 result flow, and see it reflected on
 * Standings. Since M15 a league is a single competition run — no Season
 * layer.
 */
describe('Competitions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const users: Record<string, TestUser> = {
    alice: { email: `e2e-m8-alice-${stamp}@test.com`, token: '', id: '' },
    bob: { email: `e2e-m8-bob-${stamp}@test.com`, token: '', id: '' },
  };
  const password = 'password123';
  const leagueId = `e2e-m8-league-${stamp}`;

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  async function onboard(user: TestUser) {
    const signUp = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: user.email, password })
      .expect(201);

    const verify = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ email: user.email, code: signUp.body.devVerificationCode })
      .expect(200);

    user.token = verify.body.accessToken;
    user.id = signUp.body.userId;

    await authed(user.token, 'patch', '/users/me/basic-profile').send({
      firstName: 'Test',
      lastName: 'Player',
      dominantHand: 'RIGHT',
    });
    await authed(user.token, 'patch', '/users/me/tennis-experience').send({
      experienceSignal: 'NEW',
    });

    const start = await authed(user.token, 'post', '/assessment/sessions').send(
      {},
    );
    let next = start.body.nextQuestion;
    while (next) {
      const answer = await authed(
        user.token,
        'post',
        `/assessment/sessions/${start.body.sessionId}/answers`,
      ).send({ questionId: next.questionId, selectedOption: 'D' });
      next = answer.body.nextQuestion ?? null;
    }

    await authed(user.token, 'patch', '/users/me/level').send({
      userSelectedLevel: 4.0,
    });
    await authed(user.token, 'patch', '/users/me/goals').send({
      goals: ['play_more'],
    });
    await authed(user.token, 'patch', '/users/me/preferences').send({
      formatPreference: 'EITHER',
      stylePreference: 'SOCIAL',
      preferredTimeSlots: ['MORNING'],
    });
    await authed(user.token, 'patch', '/users/me/location').send({
      generalLocation: 'London',
      latitude: 51.5074,
      longitude: -0.1278,
      locationSource: 'MANUAL',
    });
    await authed(user.token, 'patch', '/users/me/club-courts').send({});
    await authed(user.token, 'patch', '/users/me/availability').send({
      slots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
    });
    await authed(user.token, 'patch', '/users/me/padel-interest').send({
      padelInterest: 'NO',
    });
  }

  async function waitUntil(
    check: () => Promise<boolean>,
    timeoutMs: number,
    intervalMs = 500,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await check()) return;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error('waitUntil timed out');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    await onboard(users.alice);
    await onboard(users.bob);

    const now = Date.now();
    await prisma.league.create({
      data: {
        id: leagueId,
        name: `E2E League ${stamp}`,
        registrationOpensAt: new Date(now - 1000),
        registrationClosesAt: new Date(now + 2000),
        startsAt: new Date(now + 3000),
        roundCount: 1,
        // Deliberately far off — this test plays the fixture manually and
        // must not race the round-close sweep (already covered by
        // competitions.service.spec.ts's unit tests).
        roundIntervalMinutes: 120,
      },
    });
  }, 120_000);

  afterAll(async () => {
    for (const user of Object.values(users)) {
      const record = await prisma.user.findUnique({
        where: { email: user.email },
      });
      if (!record) continue;

      const profile = await prisma.tennisProfile.findUnique({
        where: { userId: record.id },
      });
      if (profile) {
        await prisma.availabilitySlot.deleteMany({
          where: { tennisProfileId: profile.id },
        });
        await prisma.assessmentAnswer.deleteMany({
          where: { session: { tennisProfileId: profile.id } },
        });
        await prisma.assessmentSession.deleteMany({
          where: { tennisProfileId: profile.id },
        });
      }
      const matchIds = await prisma.matchParticipant.findMany({
        where: { userId: record.id },
        select: { matchId: true },
      });
      await prisma.match.deleteMany({
        where: { id: { in: matchIds.map((m) => m.matchId) } },
      });
      await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
      await prisma.verificationCode.deleteMany({
        where: { userId: record.id },
      });
      await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
      await prisma.user.delete({ where: { id: record.id } });
    }
    // Cascades to LeagueRegistration/Round → Fixture/Standing.
    await prisma.league.deleteMany({ where: { id: leagueId } });
    await app.close();
  }, 30_000);

  it('registers, opens Round 1 automatically, and reflects a played fixture on standings', async () => {
    const { alice, bob } = users;

    const aliceReg = await authed(
      alice.token,
      'post',
      `/leagues/${leagueId}/register`,
    ).expect(201);
    expect(aliceReg.body.status).toBe('ENROLLED');

    const bobReg = await authed(
      bob.token,
      'post',
      `/leagues/${leagueId}/register`,
    ).expect(201);
    expect(bobReg.body.status).toBe('ENROLLED');

    // Duplicate registration is rejected.
    await authed(alice.token, 'post', `/leagues/${leagueId}/register`).expect(
      400,
    );

    const players = await authed(
      alice.token,
      'get',
      `/leagues/${leagueId}/registrations`,
    ).expect(200);
    expect(players.body.players).toHaveLength(2);

    // Round 1 doesn't exist until startsAt passes — ensureLeagueProgressed
    // is lazy, so poll rather than sleep a fixed guess.
    let matchId = '';
    await waitUntil(async () => {
      const res = await authed(
        alice.token,
        'get',
        `/leagues/${leagueId}/rounds/current`,
      ).expect(200);
      const round = res.body.round;
      if (!round) return false;
      expect(round.index).toBe(1);
      expect(round.fixtures).toHaveLength(1);
      const fixture = round.fixtures[0];
      expect(fixture.isBye).toBe(false);
      expect(fixture.match).not.toBeNull();
      matchId = fixture.match.id as string;
      return true;
    }, 15_000);

    // A fixture's match is pre-accepted but still starts in SCHEDULING —
    // pairing is mandatory, but the pair still agrees a time themselves.
    const proposed = await authed(
      alice.token,
      'post',
      `/matches/${matchId}/proposals`,
    )
      .send({ options: [new Date(Date.now() + 86_400_000).toISOString()] })
      .expect(201);
    const optionId = proposed.body.latestProposal.options[0].id;
    await authed(bob.token, 'patch', `/matches/${matchId}/proposals/accept`)
      .send({ optionId })
      .expect(200);

    // Play it through the M7 flow — already thoroughly e2e-tested there,
    // this just proves the fixture's match is a real, usable Match.
    await authed(alice.token, 'post', `/matches/${matchId}/results`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 6, sideBGames: 2 }] })
      .expect(201);
    const confirmed = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/results/confirm`,
    )
      .send()
      .expect(200);
    expect(confirmed.body.state).toBe('COMPLETED');
    expect(confirmed.body.competitionContext.leagueName).toBe(
      `E2E League ${stamp}`,
    );
    expect(confirmed.body.competitionContext.roundIndex).toBe(1);

    const standings = await authed(
      alice.token,
      'get',
      `/leagues/${leagueId}/standings`,
    ).expect(200);
    const rows = standings.body.standings as Array<{
      userId: string;
      rank: number;
      points: number;
      wins: number;
      losses: number;
    }>;
    expect(rows).toHaveLength(2);
    const winner = rows.find((r) => r.userId === alice.id)!;
    const loser = rows.find((r) => r.userId === bob.id)!;
    expect(winner.rank).toBe(1);
    expect(winner.points).toBe(3);
    expect(winner.wins).toBe(1);
    expect(loser.losses).toBe(1);

    // The round's deadline is hours away — playing the fixture doesn't
    // early-close the round or the league; only the deadline does.
    const league = await authed(
      alice.token,
      'get',
      `/leagues/${leagueId}`,
    ).expect(200);
    expect(league.body.competitionState).toBe('ACTIVE');
  }, 30_000);
});
