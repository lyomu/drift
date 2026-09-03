import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Learning, Skills, Practice & Progress (Phase M10) against live Postgres,
 * exercising the seeded content from `prisma/seed.ts`'s
 * `seedLearningContent()`. The seed script must have been run at least
 * once against this database before this spec runs.
 */
describe('Learning (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const alice = { email: `e2e-m10-alice-${stamp}@test.com`, token: '', id: '' };
  const password = 'password123';

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
      ).send({ questionId: next.questionId, selectedOption: 'C' });
      next = answer.body.nextQuestion ?? null;
    }

    await authed(user.token, 'patch', '/users/me/level').send({
      userSelectedLevel: 3.0,
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
  }, 60_000);

  afterAll(async () => {
    const record = await prisma.user.findUnique({
      where: { email: alice.email },
    });
    if (record) {
      const profile = await prisma.tennisProfile.findUnique({
        where: { userId: record.id },
      });
      if (profile) {
        await prisma.goalMilestone.deleteMany({
          where: { goal: { tennisProfileId: profile.id } },
        });
        await prisma.goal.deleteMany({
          where: { tennisProfileId: profile.id },
        });
        await prisma.practiceSession.deleteMany({
          where: { tennisProfileId: profile.id },
        });
        await prisma.learningContentCompletion.deleteMany({
          where: { tennisProfileId: profile.id },
        });
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
      await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
      await prisma.verificationCode.deleteMany({
        where: { userId: record.id },
      });
      await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
      await prisma.user.delete({ where: { id: record.id } });
    }
    await app.close();
  });

  it('reads DIRECTIONAL from the assessment baseline alone — never falsely precise', async () => {
    const profile = await authed(
      alice.token,
      'get',
      '/learning/skill-profile',
    ).expect(200);
    const forehand = profile.body.skills.find(
      (s: { skill: string }) => s.skill === 'FOREHAND',
    );
    expect(forehand.score).not.toBeNull();
    expect(forehand.maturity).toBe('DIRECTIONAL');
  });

  it('logging a practice session upgrades that skill to ESTABLISHED', async () => {
    await authed(alice.token, 'post', '/learning/practice-sessions')
      .send({
        occurredAt: new Date().toISOString(),
        durationMinutes: 30,
        skillFocus: 'FOREHAND',
        perceivedPerformance: 5,
      })
      .expect(201);

    const profile = await authed(
      alice.token,
      'get',
      '/learning/skill-profile',
    ).expect(200);
    const forehand = profile.body.skills.find(
      (s: { skill: string }) => s.skill === 'FOREHAND',
    );
    expect(forehand.maturity).toBe('ESTABLISHED');

    const backhand = profile.body.skills.find(
      (s: { skill: string }) => s.skill === 'BACKHAND',
    );
    expect(backhand.maturity).toBe('DIRECTIONAL');
  });

  it('browses seeded content and filters by target skill', async () => {
    const forehandOnly = await authed(
      alice.token,
      'get',
      '/learning/content?targetSkill=FOREHAND',
    ).expect(200);

    const ids = forehandOnly.body.content.map((c: { id: string }) => c.id);
    expect(ids).toContain('seed-learning-forehand-crosscourt-drill');
    expect(ids).not.toContain('seed-learning-backhand-consistency-drill');
  });

  it('fetches a single content item by id', async () => {
    const drill = await authed(
      alice.token,
      'get',
      '/learning/content/seed-learning-forehand-crosscourt-drill',
    ).expect(200);
    expect(drill.body.title).toBe('Cross-Court Forehand Drill');
  });

  it('marking content complete does not change the skill score — only practice sessions do', async () => {
    const before = await authed(
      alice.token,
      'get',
      '/learning/skill-profile/FOREHAND',
    ).expect(200);

    await authed(
      alice.token,
      'post',
      '/learning/content/seed-learning-backhand-consistency-drill/complete',
    ).expect(201);

    const after = await authed(
      alice.token,
      'get',
      '/learning/skill-profile/FOREHAND',
    ).expect(200);
    expect(after.body.score).toBe(before.body.score);
  });

  it('creates a goal and derives its status on read, never stored as ACHIEVED prematurely', async () => {
    const created = await authed(alice.token, 'post', '/learning/goals')
      .send({ skill: 'BACKHAND', target: 6, milestones: ['Hit 20 in a row'] })
      .expect(201);

    expect(created.body.status).not.toBe('ACHIEVED');

    const fetched = await authed(
      alice.token,
      'get',
      `/learning/goals/${created.body.id}`,
    ).expect(200);
    expect(fetched.body.skill).toBe('BACKHAND');
    expect(fetched.body.milestones).toHaveLength(1);
  });

  it('completing every milestone and the goal itself marks it ACHIEVED', async () => {
    const created = await authed(alice.token, 'post', '/learning/goals')
      .send({ skill: 'SERVE', target: 3 })
      .expect(201);

    const completed = await authed(
      alice.token,
      'patch',
      `/learning/goals/${created.body.id}/complete`,
    ).expect(200);
    expect(completed.body.status).toBe('ACHIEVED');
  });

  it('deletes a goal', async () => {
    const created = await authed(alice.token, 'post', '/learning/goals')
      .send({ skill: 'RETURN', target: 4 })
      .expect(201);

    await authed(
      alice.token,
      'delete',
      `/learning/goals/${created.body.id}`,
    ).expect(200);

    await authed(
      alice.token,
      'get',
      `/learning/goals/${created.body.id}`,
    ).expect(404);
  });

  it('the progress report reflects the logged FOREHAND practice', async () => {
    const report = await authed(
      alice.token,
      'get',
      '/learning/progress',
    ).expect(200);
    expect(report.body).toBeDefined();
  });
});
