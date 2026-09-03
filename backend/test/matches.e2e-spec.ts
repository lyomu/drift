import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { io, Socket } from 'socket.io-client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface TestUser {
  email: string;
  token: string;
  id: string;
}

/**
 * The full §4.2 workflow against live Postgres, plus the socket gateway.
 * Covers the two things unit tests can't prove: that the state machine holds
 * across real HTTP round trips, and that an authenticated socket actually
 * receives what the REST call broadcasts.
 */
describe('Matches & Messaging (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let baseUrl: string;

  const stamp = Date.now();
  const users: Record<string, TestUser> = {
    alice: { email: `e2e-m6-alice-${stamp}@test.com`, token: '', id: '' },
    bob: { email: `e2e-m6-bob-${stamp}@test.com`, token: '', id: '' },
    cara: { email: `e2e-m6-cara-${stamp}@test.com`, token: '', id: '' },
    dan: { email: `e2e-m6-dan-${stamp}@test.com`, token: '', id: '' },
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
      padelInterest: 'NO',
    });
  }

  const inDays = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    // A real port is required — the socket client connects over the network.
    await app.listen(0);
    baseUrl = await app.getUrl();

    prisma = moduleFixture.get(PrismaService);

    for (const user of Object.values(users)) {
      await onboard(user);
    }
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
      // Matches cascade to participants, proposals, conversation and
      // messages, so deleting them clears the messaging rows too.
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

  it('walks a singles match from challenge to scheduled, then reschedules and cancels', async () => {
    const { alice, bob } = users;

    // --- Challenge.
    const created = await authed(alice.token, 'post', '/matches')
      .send({ opponentId: bob.id, format: 'SINGLES' })
      .expect(201);

    const matchId = created.body.id;
    expect(created.body.state).toBe('PROPOSED');
    expect(created.body.conversationId).toBeTruthy();

    // Proposing before acceptance is rejected.
    await authed(alice.token, 'post', `/matches/${matchId}/proposals`)
      .send({ options: [inDays(2)] })
      .expect(400);

    // --- Accept → SCHEDULING.
    const accepted = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/accept`,
    )
      .send({})
      .expect(200);
    expect(accepted.body.state).toBe('SCHEDULING');

    // --- Alice proposes, Bob counters, Alice accepts.
    await authed(alice.token, 'post', `/matches/${matchId}/proposals`)
      .send({ options: [inDays(2), inDays(3)] })
      .expect(201);

    // Alice can't propose twice in a row.
    await authed(alice.token, 'post', `/matches/${matchId}/proposals`)
      .send({ options: [inDays(4)] })
      .expect(400);

    const countered = await authed(
      bob.token,
      'post',
      `/matches/${matchId}/proposals`,
    )
      .send({ options: [inDays(5)] })
      .expect(201);

    const optionId = countered.body.latestProposal.options[0].id;

    // Bob can't accept his own proposal.
    await authed(bob.token, 'patch', `/matches/${matchId}/proposals/accept`)
      .send({ optionId })
      .expect(400);

    const scheduled = await authed(
      alice.token,
      'patch',
      `/matches/${matchId}/proposals/accept`,
    )
      .send({ optionId })
      .expect(200);

    expect(scheduled.body.state).toBe('SCHEDULED');
    expect(scheduled.body.confirmedTime).toBeTruthy();

    // --- Free-text court suggestion still works unchanged post-M9 — no
    // matching real Court row is required.
    const withCourt = await authed(
      alice.token,
      'patch',
      `/matches/${matchId}/court`,
    )
      .send({ courtName: 'Victoria Park Courts' })
      .expect(200);
    expect(withCourt.body.courtName).toBe('Victoria Park Courts');
    expect(withCourt.body.court).toBeNull();

    // --- The thread carries a system message per transition.
    const conversationId = created.body.conversationId;
    const thread = await authed(
      alice.token,
      'get',
      `/conversations/${conversationId}/messages`,
    ).expect(200);

    const events = thread.body.messages.map(
      (m: { systemEvent: string }) => m.systemEvent,
    );
    expect(events).toContain('match_challenge_sent');
    expect(events).toContain('match_challenge_accepted');
    expect(events).toContain('match_time_proposed');
    expect(events).toContain('match_confirmed');
    expect(events).toContain('match_court_suggested');

    // --- Reschedule reopens negotiation with a fresh budget.
    const rescheduled = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/reschedule`,
    ).expect(200);
    expect(rescheduled.body.state).toBe('RESCHEDULED');
    expect(rescheduled.body.confirmedTime).toBeNull();
    expect(rescheduled.body.roundsRemaining).toBe(3);

    // --- Cancel is terminal.
    const cancelled = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/cancel`,
    )
      .send({ reason: 'Injured' })
      .expect(200);
    expect(cancelled.body.state).toBe('CANCELLED');

    await authed(alice.token, 'patch', `/matches/${matchId}/reschedule`).expect(
      400,
    );
  }, 60_000);

  it('keeps a doubles match PROPOSED until all four have accepted', async () => {
    const { alice, bob, cara, dan } = users;

    const created = await authed(alice.token, 'post', '/matches')
      .send({ opponentId: bob.id, format: 'DOUBLES', partnerId: cara.id })
      .expect(201);

    const matchId = created.body.id;
    expect(created.body.state).toBe('PROPOSED');
    // Alice (accepted), Cara (invited), Bob (invited) — Bob's partner comes
    // when he accepts.
    expect(created.body.participants).toHaveLength(3);

    // Alice's partner accepts — still not everyone.
    const afterCara = await authed(
      cara.token,
      'patch',
      `/matches/${matchId}/accept`,
    )
      .send({})
      .expect(200);
    expect(afterCara.body.state).toBe('PROPOSED');

    // The opponent must nominate a partner.
    await authed(bob.token, 'patch', `/matches/${matchId}/accept`)
      .send({})
      .expect(400);

    const afterBob = await authed(
      bob.token,
      'patch',
      `/matches/${matchId}/accept`,
    )
      .send({ partnerId: dan.id })
      .expect(200);

    // Dan is now in the match but hasn't accepted yet.
    expect(afterBob.body.participants).toHaveLength(4);
    expect(afterBob.body.state).toBe('PROPOSED');

    const afterDan = await authed(
      dan.token,
      'patch',
      `/matches/${matchId}/accept`,
    )
      .send({})
      .expect(200);
    expect(afterDan.body.state).toBe('SCHEDULING');

    // Dan was added to the thread when nominated.
    const conversationId = afterDan.body.conversationId;
    await authed(
      dan.token,
      'get',
      `/conversations/${conversationId}/messages`,
    ).expect(200);
  }, 60_000);

  it('rejects an unauthenticated socket and delivers messages to an authenticated one', async () => {
    const { alice, bob } = users;

    const created = await authed(alice.token, 'post', '/matches')
      .send({ opponentId: bob.id })
      .expect(201);
    const conversationId = created.body.conversationId;

    // --- Unauthenticated sockets are disconnected.
    const anonymous: Socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
    });
    const rejected = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 8000);
      anonymous.on('disconnect', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    anonymous.close();
    expect(rejected).toBe(true);

    // --- Bob listens, Alice sends over REST, Bob receives over the socket.
    const bobSocket: Socket = io(baseUrl, {
      transports: ['websocket'],
      auth: { token: bob.token },
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('socket never connected')),
        8000,
      );
      bobSocket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    const delivered = new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('message never arrived')),
          8000,
        );
        bobSocket.on('message:new', (payload: Record<string, unknown>) => {
          clearTimeout(timer);
          resolve(payload);
        });
      },
    );

    await authed(
      alice.token,
      'post',
      `/conversations/${conversationId}/messages`,
    )
      .send({ body: 'See you Saturday' })
      .expect(201);

    const payload = await delivered;
    expect(payload.body).toBe('See you Saturday');
    expect(payload.conversationId).toBe(conversationId);

    bobSocket.close();
  }, 60_000);
});
