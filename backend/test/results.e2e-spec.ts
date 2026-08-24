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
 * The §4.3 result flow against live Postgres: a full singles match through
 * submit → confirm → rating change → history, a dispute that resolves via
 * mutual re-confirmation, and a walkover. Everything M6's e2e suite already
 * proved (challenge/scheduling/messaging) isn't re-tested here — only what's
 * new this phase.
 */
describe('Match Results (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const users: Record<string, TestUser> = {
    alice: { email: `e2e-m7-alice-${stamp}@test.com`, token: '', id: '' },
    bob: { email: `e2e-m7-bob-${stamp}@test.com`, token: '', id: '' },
  };
  const password = 'password123';

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

  /** Challenge → accept → propose → accept-time, landing on SCHEDULED. */
  async function scheduleMatch(
    challenger: TestUser,
    opponent: TestUser,
  ): Promise<string> {
    const created = await authed(challenger.token, 'post', '/matches')
      .send({ opponentId: opponent.id, format: 'SINGLES' })
      .expect(201);
    const matchId = created.body.id as string;

    await authed(opponent.token, 'patch', `/matches/${matchId}/accept`)
      .send({})
      .expect(200);

    const proposed = await authed(
      challenger.token,
      'post',
      `/matches/${matchId}/proposals`,
    )
      .send({ options: [new Date(Date.now() + 86_400_000).toISOString()] })
      .expect(201);

    const optionId = proposed.body.latestProposal.options[0].id;
    await authed(
      opponent.token,
      'patch',
      `/matches/${matchId}/proposals/accept`,
    )
      .send({ optionId })
      .expect(200);

    return matchId;
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
      await prisma.connection.deleteMany({
        where: {
          OR: [{ requesterId: record.id }, { addresseeId: record.id }],
        },
      });
      await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
      await prisma.verificationCode.deleteMany({
        where: { userId: record.id },
      });
      await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
      await prisma.user.delete({ where: { id: record.id } });
    }
    await app.close();
  }, 30_000);

  it('takes a scored match through submit → confirm → rating change → history + stats', async () => {
    const { alice, bob } = users;
    const matchId = await scheduleMatch(alice, bob);

    const beforeStats = await authed(alice.token, 'get', '/me/stats').expect(
      200,
    );
    const ratingBefore = beforeStats.body.singles.rating ?? 4.0;

    // Alice submits, claiming a win.
    const submitted = await authed(
      alice.token,
      'post',
      `/matches/${matchId}/results`,
    )
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 6, sideBGames: 2 }] })
      .expect(201);
    expect(submitted.body.result.status).toBe('PENDING_CONFIRMATION');
    expect(submitted.body.result.winningSide).toBe('A');

    // Alice can't confirm her own submission.
    await authed(alice.token, 'patch', `/matches/${matchId}/results/confirm`)
      .send()
      .expect(403);

    // Bob confirms.
    const confirmed = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/results/confirm`,
    )
      .send()
      .expect(200);
    expect(confirmed.body.state).toBe('COMPLETED');
    expect(confirmed.body.result.status).toBe('CONFIRMED');
    expect(confirmed.body.result.ratingDeltaA).toBeGreaterThan(0);
    expect(confirmed.body.result.ratingDeltaB).toBeLessThan(0);

    // The rating actually moved on Alice's profile.
    const afterStats = await authed(alice.token, 'get', '/me/stats').expect(
      200,
    );
    expect(afterStats.body.singles.rating).toBeGreaterThan(ratingBefore);
    expect(afterStats.body.singles.wins).toBe(1);
    expect(afterStats.body.recentForm[0]).toBe('W');

    // It shows up in history for both players.
    const history = await authed(
      alice.token,
      'get',
      '/matches?segment=history',
    ).expect(200);
    expect(
      history.body.matches.some((m: { id: string }) => m.id === matchId),
    ).toBe(true);

    // A duplicate submission is rejected.
    await authed(alice.token, 'post', `/matches/${matchId}/results`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 6, sideBGames: 2 }] })
      .expect(400);

    // Reflection can be saved once settled.
    await authed(alice.token, 'post', `/matches/${matchId}/reflection`)
      .send({ confidence: 4, notes: 'Felt good' })
      .expect(201);
  }, 30_000);

  it('resolves a dispute through mutual re-confirmation', async () => {
    const { alice, bob } = users;
    const matchId = await scheduleMatch(bob, alice);

    await authed(bob.token, 'post', `/matches/${matchId}/results`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 6, sideBGames: 4 }] })
      .expect(201);

    // Alice disagrees with her own version.
    const disputed = await authed(
      alice.token,
      'patch',
      `/matches/${matchId}/results/dispute`,
    )
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 4, sideBGames: 6 }] })
      .expect(200);
    expect(disputed.body.state).toBe('DISPUTED');
    expect(disputed.body.result.status).toBe('DISPUTED');

    // A revision that still disagrees changes nothing structurally.
    const stillDisputed = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/results/resubmit`,
    )
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 7, sideBGames: 5 }] })
      .expect(200);
    expect(stillDisputed.body.state).toBe('DISPUTED');

    // Bob accepts Alice's version outright — mutual re-confirmation.
    const resolved = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/results/resubmit`,
    )
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 4, sideBGames: 6 }] })
      .expect(200);
    expect(resolved.body.state).toBe('COMPLETED');
    expect(resolved.body.result.status).toBe('CONFIRMED');
    expect(resolved.body.result.winningSide).toBe('B');
  }, 30_000);

  it('confirms a walkover in favour of neither player, rating untouched', async () => {
    const { alice, bob } = users;
    const matchId = await scheduleMatch(alice, bob);

    const beforeStats = await authed(alice.token, 'get', '/me/stats').expect(
      200,
    );

    await authed(alice.token, 'post', `/matches/${matchId}/results`)
      .send({ outcome: 'WALKOVER' })
      .expect(201);

    const confirmed = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/results/confirm`,
    )
      .send()
      .expect(200);
    expect(confirmed.body.state).toBe('WALKOVER');
    expect(confirmed.body.result.winningSide).toBeNull();
    expect(confirmed.body.result.ratingDeltaA).toBeNull();

    const afterStats = await authed(alice.token, 'get', '/me/stats').expect(
      200,
    );
    expect(afterStats.body.singles.rating).toBe(
      beforeStats.body.singles.rating,
    );
  }, 30_000);
});
