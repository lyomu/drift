import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Padel Expansion — Core Loop (Phase M13) against live Postgres: Add Padel
 * → assessment → Padel Profile → a real Padel match played end to end with
 * real rating updates landing on PadelProfile, never TennisProfile.
 */
describe('Padel (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const alice = { email: `e2e-m13-alice-${stamp}@test.com`, token: '', id: '' };
  const bob = { email: `e2e-m13-bob-${stamp}@test.com`, token: '', id: '' };

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  async function onboard(user: { email: string; token: string; id: string }) {
    const signUp = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: user.email, password, acceptedAgePolicy: true })
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
      padelInterest: 'YES',
    });
  }

  /** Drives the Beginner branch deterministically: a low first answer
   * (Rally Consistency) locks the session to the 6-pillar Beginner scope. */
  async function completeBeginnerAssessment(user: { token: string }) {
    const session = await authed(
      user.token,
      'post',
      '/padel/assessment/sessions',
    )
      .send({})
      .expect(201);
    const sessionId = session.body.sessionId;

    let next = session.body.nextQuestion;
    let first = true;
    while (next) {
      const selectedOption = first ? 'B' : 'F';
      first = false;
      const answer = await authed(
        user.token,
        'post',
        `/padel/assessment/sessions/${sessionId}/answers`,
      ).send({ questionId: next.questionId, selectedOption });
      next = answer.body.nextQuestion ?? null;
    }
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

    await onboard(alice);
    await onboard(bob);
  }, 90_000);

  afterAll(async () => {
    for (const user of [alice, bob]) {
      const record = await prisma.user.findUnique({
        where: { email: user.email },
      });
      if (!record) continue;
      const tennisProfile = await prisma.tennisProfile.findUnique({
        where: { userId: record.id },
      });
      const padelProfile = await prisma.padelProfile.findUnique({
        where: { userId: record.id },
      });
      if (padelProfile) {
        await prisma.padelAssessmentAnswer.deleteMany({
          where: { session: { padelProfileId: padelProfile.id } },
        });
        await prisma.padelAssessmentSession.deleteMany({
          where: { padelProfileId: padelProfile.id },
        });
      }
      await prisma.matchResult.deleteMany({
        where: { match: { participants: { some: { userId: record.id } } } },
      });
      await prisma.timeProposalOption.deleteMany({
        where: {
          proposal: {
            match: { participants: { some: { userId: record.id } } },
          },
        },
      });
      await prisma.timeProposal.deleteMany({
        where: { match: { participants: { some: { userId: record.id } } } },
      });
      await prisma.message.deleteMany({
        where: {
          conversation: { participants: { some: { userId: record.id } } },
        },
      });
      await prisma.conversationParticipant.deleteMany({
        where: { userId: record.id },
      });
      await prisma.matchParticipant.deleteMany({
        where: { userId: record.id },
      });
      await prisma.match.deleteMany({ where: { createdById: record.id } });
      if (tennisProfile) {
        await prisma.availabilitySlot.deleteMany({
          where: { tennisProfileId: tennisProfile.id },
        });
        await prisma.assessmentAnswer.deleteMany({
          where: { session: { tennisProfileId: tennisProfile.id } },
        });
        await prisma.assessmentSession.deleteMany({
          where: { tennisProfileId: tennisProfile.id },
        });
      }
      await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
      await prisma.verificationCode.deleteMany({
        where: { userId: record.id },
      });
      await prisma.padelProfile.deleteMany({ where: { userId: record.id } });
      await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
      await prisma.user.delete({ where: { id: record.id } });
    }
    await app.close();
  });

  it('404s before Padel is added', async () => {
    await authed(alice.token, 'get', '/padel/profile').expect(404);
  });

  it('adds Padel — idempotent on a second call', async () => {
    await authed(alice.token, 'post', '/padel/profile').send({}).expect(201);
    const second = await authed(alice.token, 'post', '/padel/profile')
      .send({})
      .expect(201);
    expect(second.body.singlesRating).toBeNull();

    await authed(bob.token, 'post', '/padel/profile').send({}).expect(201);
  });

  it('completes the Beginner-branch assessment and gets a real rating', async () => {
    await completeBeginnerAssessment(alice);
    await completeBeginnerAssessment(bob);

    const profile = await authed(alice.token, 'get', '/padel/profile').expect(
      200,
    );
    expect(profile.body.systemSuggestedLevel).not.toBeNull();
    expect(profile.body.skillBreakdown.RALLY_CONSISTENCY).toBeDefined();
  });

  it('updates preferences and goals', async () => {
    const updated = await authed(
      alice.token,
      'patch',
      '/padel/profile/preferences',
    )
      .send({
        preferredSide: 'LEFT',
        partnerPreference: 'Looking for a regular partner',
        goals: ['Improve my bandeja'],
      })
      .expect(200);

    expect(updated.body.preferredSide).toBe('LEFT');
    expect(updated.body.goals).toEqual(['Improve my bandeja']);
  });

  it('plays a full Padel match and updates PadelProfile, never TennisProfile', async () => {
    const tennisBefore = await prisma.tennisProfile.findUnique({
      where: { userId: alice.id },
    });

    const created = await authed(alice.token, 'post', '/matches')
      .send({ opponentId: bob.id, format: 'SINGLES', sport: 'PADEL' })
      .expect(201);
    const matchId = created.body.id;
    expect(created.body.sport).toBe('PADEL');

    await authed(bob.token, 'patch', `/matches/${matchId}/accept`)
      .send({})
      .expect(200);

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

    await authed(alice.token, 'post', `/matches/${matchId}/results`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 6, sideBGames: 3 }] })
      .expect(201);
    await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/results/confirm`,
    ).expect(200);

    const padelAfter = await prisma.padelProfile.findUnique({
      where: { userId: alice.id },
    });
    const tennisAfter = await prisma.tennisProfile.findUnique({
      where: { userId: alice.id },
    });
    expect(padelAfter?.singlesRating).not.toBeNull();
    expect(tennisAfter?.singlesRating).toBe(tennisBefore?.singlesRating);

    const history = await authed(
      alice.token,
      'get',
      '/matches?segment=history&sport=PADEL',
    ).expect(200);
    expect(
      history.body.matches.some((m: { id: string }) => m.id === matchId),
    ).toBe(true);

    const stats = await authed(
      alice.token,
      'get',
      '/me/stats?sport=PADEL',
    ).expect(200);
    expect(stats.body.singles.wins).toBe(1);
  });
});
