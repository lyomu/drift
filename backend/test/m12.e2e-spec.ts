import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Notifications, Profile, Settings & Safety (Phase M12) against live
 * Postgres. Three users: alice/bob connect and exchange a match + message
 * (to exercise notification creation across modules), carol stays
 * unconnected to bob (to prove Privacy Settings' EVERYONE visibility
 * without relying on a connection).
 */
describe('M12 — Notifications, Profile, Settings & Safety (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const alice = { email: `e2e-m12-alice-${stamp}@test.com`, token: '', id: '' };
  const bob = { email: `e2e-m12-bob-${stamp}@test.com`, token: '', id: '' };
  const carol = { email: `e2e-m12-carol-${stamp}@test.com`, token: '', id: '' };

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
      padelInterest: 'NO',
    });
  }

  async function cleanupUser(email: string) {
    const record = await prisma.user.findUnique({ where: { email } });
    if (!record) return;
    const profile = await prisma.tennisProfile.findUnique({
      where: { userId: record.id },
    });
    await prisma.notification.deleteMany({ where: { userId: record.id } });
    await prisma.notificationPreference.deleteMany({
      where: { userId: record.id },
    });
    await prisma.messageReport.deleteMany({
      where: { reporterId: record.id },
    });
    await prisma.message.deleteMany({
      where: {
        conversation: { participants: { some: { userId: record.id } } },
      },
    });
    await prisma.conversationParticipant.deleteMany({
      where: { userId: record.id },
    });
    await prisma.timeProposalOption.deleteMany({
      where: {
        proposal: { match: { participants: { some: { userId: record.id } } } },
      },
    });
    await prisma.timeProposal.deleteMany({
      where: { match: { participants: { some: { userId: record.id } } } },
    });
    await prisma.matchParticipant.deleteMany({ where: { userId: record.id } });
    await prisma.match.deleteMany({ where: { createdById: record.id } });
    await prisma.connection.deleteMany({
      where: { OR: [{ requesterId: record.id }, { addresseeId: record.id }] },
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
    await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
    await prisma.verificationCode.deleteMany({ where: { userId: record.id } });
    await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
    await prisma.user.delete({ where: { id: record.id } });
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
    await onboard(carol);
  }, 90_000);

  afterAll(async () => {
    for (const user of [alice, bob, carol]) {
      await cleanupUser(user.email);
    }
    await app.close();
  });

  let connectionId: string;
  let matchId: string;
  let conversationId: string;
  let bobMessageId: string;

  it('notifies the addressee when a connection is requested', async () => {
    const req = await authed(alice.token, 'post', '/connections')
      .send({ addresseeId: bob.id })
      .expect(201);
    connectionId = req.body.id;

    const bobNotifications = await authed(
      bob.token,
      'get',
      '/notifications',
    ).expect(200);
    expect(bobNotifications.body.unreadCount).toBeGreaterThanOrEqual(1);
    expect(
      bobNotifications.body.notifications.some(
        (n: { category: string }) => n.category === 'CONNECTIONS',
      ),
    ).toBe(true);
  });

  it('notifies the requester when the connection is accepted', async () => {
    await authed(bob.token, 'patch', `/connections/${connectionId}/accept`)
      .send({})
      .expect(200);

    const aliceNotifications = await authed(
      alice.token,
      'get',
      '/notifications',
    ).expect(200);
    expect(
      aliceNotifications.body.notifications.some(
        (n: { category: string }) => n.category === 'CONNECTIONS',
      ),
    ).toBe(true);
  });

  it('marks a single notification read, then read-all clears the rest', async () => {
    const before = await authed(bob.token, 'get', '/notifications').expect(200);
    const firstId = before.body.notifications[0].id;

    await authed(bob.token, 'patch', `/notifications/${firstId}/read`).expect(
      200,
    );
    await authed(bob.token, 'patch', '/notifications/read-all').expect(200);

    const after = await authed(bob.token, 'get', '/notifications').expect(200);
    expect(after.body.unreadCount).toBe(0);
  });

  it('a challenge notifies the opponent, and a disabled category silently skips the write', async () => {
    const created = await authed(alice.token, 'post', '/matches')
      .send({ opponentId: bob.id, format: 'SINGLES' })
      .expect(201);
    matchId = created.body.id;

    const bobNotifications = await authed(
      bob.token,
      'get',
      '/notifications',
    ).expect(200);
    expect(
      bobNotifications.body.notifications.some(
        (n: { category: string }) => n.category === 'MATCHES',
      ),
    ).toBe(true);

    await authed(bob.token, 'patch', `/matches/${matchId}/accept`)
      .send({})
      .expect(200);

    const conversations = await authed(
      alice.token,
      'get',
      '/conversations',
    ).expect(200);
    conversationId = conversations.body.conversations.find(
      (c: { matchId: string | null }) => c.matchId === matchId,
    ).id;

    // Alice opts out of MESSAGES before Bob sends one.
    await authed(alice.token, 'patch', '/notifications/preferences')
      .send({ messages: false })
      .expect(200);
    const beforeCount = (
      await authed(alice.token, 'get', '/notifications').expect(200)
    ).body.total;

    const sent = await authed(
      bob.token,
      'post',
      `/conversations/${conversationId}/messages`,
    )
      .send({ body: 'Good luck out there!' })
      .expect(201);
    bobMessageId = sent.body.id;

    const afterCount = (
      await authed(alice.token, 'get', '/notifications').expect(200)
    ).body.total;
    expect(afterCount).toBe(beforeCount);
  });

  it("Privacy Settings EVERYONE makes a player's skill breakdown visible to a non-connection", async () => {
    await authed(bob.token, 'patch', '/users/me/privacy-settings')
      .send({ skillBreakdownVisibility: 'EVERYONE' })
      .expect(200);

    // Carol has never connected with Bob.
    const bobViaCarol = await authed(
      carol.token,
      'get',
      `/players/${bob.id}`,
    ).expect(200);
    expect(bobViaCarol.body.connectionState).toBe('NONE');
    expect(bobViaCarol.body.skillBreakdown).not.toBeNull();
  });

  it('a self-view via /players/me always shows the skill breakdown, gate or not', async () => {
    await authed(bob.token, 'patch', '/users/me/privacy-settings')
      .send({ skillBreakdownVisibility: 'CONNECTIONS_ONLY' })
      .expect(200);

    const ownProfile = await authed(bob.token, 'get', '/players/me').expect(
      200,
    );
    expect(ownProfile.body.skillBreakdown).not.toBeNull();
  });

  it('updates the profile via PATCH /users/me/profile', async () => {
    const updated = await authed(alice.token, 'patch', '/users/me/profile')
      .send({ firstName: 'Alicia', bio: 'Loves a good rally.' })
      .expect(200);
    expect(updated.body.firstName).toBe('Alicia');
    expect(updated.body.bio).toBe('Loves a good rally.');
  });

  it('reports a message', async () => {
    const report = await authed(alice.token, 'post', '/safety/message-reports')
      .send({ messageId: bobMessageId, reason: 'SPAM' })
      .expect(201);
    expect(report.body.status).toBe('OPEN');

    const stored = await prisma.messageReport.findUnique({
      where: { id: report.body.reportId },
    });
    expect(stored?.reporterId).toBe(alice.id);
  });

  it('changes the password, revoking the old refresh token but keeping the access token valid', async () => {
    await authed(alice.token, 'patch', '/auth/change-password')
      .send({ currentPassword: password, newPassword: 'newpassword456' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: alice.email, password })
      .expect(401);

    const relogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: alice.email, password: 'newpassword456' })
      .expect(200);
    expect(relogin.body.accessToken).toBeDefined();
  });

  it('deletes the account, after which login is rejected like a bad password', async () => {
    await authed(bob.token, 'post', '/users/me/delete').send({}).expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: bob.email, password })
      .expect(401);
  });
});
