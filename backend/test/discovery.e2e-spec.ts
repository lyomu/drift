import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Two real users, fully onboarded against live Postgres, exercising the
 * discovery → connection → block path from
 * `foundation/03-user-journeys.md` §4.1. The gating assertions here are the
 * point: they're what proves the privacy rules in Document 6 §4 actually
 * hold end to end, not just in a mocked unit test.
 */
describe('Discovery & Connections (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const alice = { email: `e2e-alice-${stamp}@test.com`, token: '', id: '' };
  const bob = { email: `e2e-bob-${stamp}@test.com`, token: '', id: '' };
  const password = 'password123';

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  /** Runs a user all the way to onboardingStep COMPLETE. */
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
    // Same coordinates for both, so each is trivially within any radius.
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
    await onboard(bob);
  }, 60_000);

  afterAll(async () => {
    for (const user of [alice, bob]) {
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
      await prisma.playerReport.deleteMany({
        where: {
          OR: [{ reporterId: record.id }, { reportedUserId: record.id }],
        },
      });
      await prisma.block.deleteMany({
        where: { OR: [{ blockerId: record.id }, { blockedId: record.id }] },
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
  });

  it('walks discovery → connect → accept → block end to end', async () => {
    // --- Discovery: Alice can find Bob, and never sees his coordinates.
    const search = await authed(alice.token, 'get', '/players').expect(200);
    const foundBob = search.body.players.find(
      (p: { id: string }) => p.id === bob.id,
    );
    expect(foundBob).toBeDefined();
    expect(foundBob).not.toHaveProperty('latitude');
    expect(foundBob).not.toHaveProperty('longitude');
    expect(foundBob).not.toHaveProperty('email');
    expect(foundBob.availabilitySummary).toBe('Usually free weekend mornings');

    // Alice must never appear in her own results.
    expect(
      search.body.players.some((p: { id: string }) => p.id === alice.id),
    ).toBe(false);

    // --- Profile before connecting: gated fields are withheld.
    let profile = await authed(alice.token, 'get', `/players/${bob.id}`).expect(
      200,
    );
    expect(profile.body.connectionState).toBe('NONE');
    expect(profile.body.skillBreakdown).toBeNull();
    expect(profile.body.availabilitySlots).toBeNull();

    // --- Connect.
    const created = await authed(alice.token, 'post', '/connections')
      .send({ addresseeId: bob.id })
      .expect(201);
    const connectionId = created.body.id;

    profile = await authed(alice.token, 'get', `/players/${bob.id}`).expect(
      200,
    );
    expect(profile.body.connectionState).toBe('PENDING_OUTGOING');

    const bobPending = await authed(
      bob.token,
      'get',
      '/connections/pending',
    ).expect(200);
    expect(bobPending.body.incoming).toHaveLength(1);
    expect(bobPending.body.incoming[0].player.id).toBe(alice.id);

    // --- Accept, and the gate opens.
    await authed(bob.token, 'patch', `/connections/${connectionId}/accept`)
      .send()
      .expect(200);

    profile = await authed(alice.token, 'get', `/players/${bob.id}`).expect(
      200,
    );
    expect(profile.body.connectionState).toBe('CONNECTED');
    expect(profile.body.skillBreakdown).not.toBeNull();
    expect(Object.keys(profile.body.skillBreakdown).length).toBeGreaterThan(0);
    expect(profile.body.availabilitySlots).toHaveLength(1);

    const aliceConnections = await authed(
      alice.token,
      'get',
      '/connections',
    ).expect(200);
    expect(aliceConnections.body.connections).toHaveLength(1);
    expect(aliceConnections.body.connections[0].player.id).toBe(bob.id);

    // --- Report is accepted and queued for moderation.
    const report = await authed(alice.token, 'post', '/safety/reports')
      .send({ reportedUserId: bob.id, reason: 'SPAM', notes: 'testing' })
      .expect(201);
    expect(report.body.status).toBe('OPEN');

    // --- Block severs the connection and hides both users from each other.
    await authed(bob.token, 'post', '/safety/blocks')
      .send({ blockedId: alice.id })
      .expect(201);

    const aliceAfter = await authed(alice.token, 'get', '/players').expect(200);
    expect(
      aliceAfter.body.players.some((p: { id: string }) => p.id === bob.id),
    ).toBe(false);

    const bobAfter = await authed(bob.token, 'get', '/players').expect(200);
    expect(
      bobAfter.body.players.some((p: { id: string }) => p.id === alice.id),
    ).toBe(false);

    // A blocked player reads as non-existent, not as a permission error.
    await authed(alice.token, 'get', `/players/${bob.id}`).expect(404);

    // The connection itself is gone, not merely hidden.
    const afterBlock = await authed(alice.token, 'get', '/connections').expect(
      200,
    );
    expect(afterBlock.body.connections).toHaveLength(0);
  }, 30_000);
});
