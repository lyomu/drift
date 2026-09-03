import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Onboarding (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `e2e-onboarding-${Date.now()}@test.com`;
  const opponentEmail = `e2e-onboarding-opponent-${Date.now()}@test.com`;
  const password = 'password123';
  let accessToken: string;

  const bearer = (
    token: string,
    method: 'get' | 'post' | 'patch',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  async function signUp(emailAddress: string): Promise<string> {
    const signUpRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: emailAddress, password })
      .expect(201);

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({
        email: emailAddress,
        code: signUpRes.body.devVerificationCode,
      })
      .expect(200);

    return verifyRes.body.accessToken;
  }

  async function createSuggestedOpponent() {
    const token = await signUp(opponentEmail);
    await bearer(token, 'patch', '/users/me/basic-profile')
      .send({
        firstName: 'Casey',
        lastName: 'Opponent',
        dominantHand: 'RIGHT',
      })
      .expect(200);
    await bearer(token, 'patch', '/users/me/tennis-experience')
      .send({
        experienceSignal: 'NEW',
      })
      .expect(200);
    await bearer(token, 'patch', '/users/me/level')
      .send({
        userSelectedLevel: 7.0,
      })
      .expect(200);
    await bearer(token, 'patch', '/users/me/goals')
      .send({
        goals: ['play_more'],
      })
      .expect(200);
    await bearer(token, 'patch', '/users/me/preferences')
      .send({
        formatPreference: 'EITHER',
        stylePreference: 'SOCIAL',
        preferredTimeSlots: ['EVENING'],
      })
      .expect(200);
    await bearer(token, 'patch', '/users/me/location')
      .send({
        generalLocation: 'Brooklyn, NY',
        locationSource: 'MANUAL',
      })
      .expect(200);
    await bearer(token, 'patch', '/users/me/club-courts').send({}).expect(200);
    await bearer(token, 'patch', '/users/me/availability')
      .send({
        slots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
      })
      .expect(200);
    await bearer(token, 'patch', '/users/me/padel-interest')
      .send({
        padelInterest: 'NO',
      })
      .expect(200);
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
    accessToken = await signUp(email);
    await createSuggestedOpponent();
  });

  afterAll(async () => {
    for (const emailAddress of [email, opponentEmail]) {
      await deleteUser(emailAddress);
    }
    await app.close();
  });

  async function deleteUser(emailAddress: string) {
    const user = await prisma.user.findUnique({
      where: { email: emailAddress },
    });
    if (user) {
      const profile = await prisma.tennisProfile.findUnique({
        where: { userId: user.id },
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
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
      await prisma.tennisProfile.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }

  const authed = (method: 'get' | 'post' | 'patch', path: string) =>
    bearer(accessToken, method, path);

  it('walks the full onboarding journey to COMPLETE', async () => {
    let res = await authed('patch', '/users/me/basic-profile').send({
      firstName: 'Alex',
      lastName: 'Player',
      dominantHand: 'RIGHT',
    });
    expect(res.status).toBe(200);
    expect(res.body.onboardingStep).toBe('TENNIS_EXPERIENCE');

    res = await authed('patch', '/users/me/tennis-experience').send({
      experienceSignal: 'NEW',
    });
    expect(res.status).toBe(200);
    expect(res.body.onboardingStep).toBe('ASSESSMENT');

    const start = await authed('post', '/assessment/sessions').send({});
    expect(start.status).toBe(201);
    expect(start.body.branch).toBe('BEGINNER');
    expect(start.body.questionBudget).toBe(6);

    let next = start.body.nextQuestion;
    let last:
      | { body: { complete?: boolean; level?: number; label?: string } }
      | undefined;
    while (next) {
      const answerRes = await authed(
        'post',
        `/assessment/sessions/${start.body.sessionId}/answers`,
      ).send({ questionId: next.questionId, selectedOption: 'F' });
      expect(answerRes.status).toBe(201);
      last = answerRes;
      next = answerRes.body.nextQuestion ?? null;
    }
    expect(last?.body.complete).toBe(true);
    expect(last?.body.level).toBe(7.0);
    expect(last?.body.label).toBe('Advanced');

    const me = await authed('get', '/users/me');
    expect(me.body.onboardingStep).toBe('LEVEL_REVIEW');

    res = await authed('patch', '/users/me/level').send({
      userSelectedLevel: 7.0,
    });
    expect(res.body.onboardingStep).toBe('GOALS');

    res = await authed('patch', '/users/me/goals').send({
      goals: ['play_more'],
    });
    expect(res.body.onboardingStep).toBe('PLAYING_PREFERENCES');

    res = await authed('patch', '/users/me/preferences').send({
      formatPreference: 'EITHER',
      stylePreference: 'SOCIAL',
      preferredTimeSlots: ['EVENING'],
    });
    expect(res.body.onboardingStep).toBe('LOCATION');

    res = await authed('patch', '/users/me/location').send({
      generalLocation: 'Brooklyn, NY',
      locationSource: 'MANUAL',
    });
    expect(res.body.onboardingStep).toBe('CLUB_COURTS');

    res = await authed('patch', '/users/me/club-courts').send({});
    expect(res.body.onboardingStep).toBe('AVAILABILITY');

    res = await authed('patch', '/users/me/availability').send({
      slots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
    });
    expect(res.body.onboardingStep).toBe('PADEL_INTEREST');

    res = await authed('patch', '/users/me/padel-interest').send({
      padelInterest: 'NO',
    });
    expect(res.body.onboardingStep).toBe('COMPLETE');

    const final = await authed('get', '/users/me');
    expect(final.body.onboardingStep).toBe('COMPLETE');
    expect(final.body.onboardingCompletedAt).toBeTruthy();

    // Identity data (level, goals) moved out of the feed and into the
    // header endpoint — see HOME-AND-POLISH-PLAN.md Wave 2.7.
    const summary = await authed('get', '/home/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.level).toBe(7.0);
    expect(summary.body.levelLabel).toBe('Advanced');
    expect(summary.body.goals).toEqual(['play_more']);

    const feed = await authed('get', '/home/feed');
    expect(feed.status).toBe(200);
    // A fresh, matchless/competitionless account has nothing in Tier 1
    // (urgent), so the feed falls through to Tier 2 (discovery) cards.
    // This spec creates a second complete player in beforeAll so the
    // suggested-opponents card is reachable even on CI's clean database.
    // NEARBY_COURTS, CLUB_ANNOUNCEMENT and ACHIEVEMENT_PROGRESS depend on
    // seed data this spec doesn't set up (no club, no achievements yet), so
    // they're absent here rather than asserted on. NEWS_HIGHLIGHT is the next
    // card that's always reachable, so it's what follows in this environment.
    expect(
      feed.body.cards.slice(0, 3).map((c: { type: string }) => c.type),
    ).toEqual([
      'SUGGESTED_OPPONENTS',
      'DEVELOPMENT_RECOMMENDATION',
      'NEWS_HIGHLIGHT',
    ]);
  });
});
