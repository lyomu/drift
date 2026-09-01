import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { PlatformPermission } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface TestUser {
  email: string;
  token: string;
  id: string;
}

/**
 * Platform Admin v1 (Wave 5) against live Postgres: staff-token isolation
 * from player tokens, suspension that actually cuts access end to end,
 * the reports triage loop (the write-only PlayerReport/MessageReport gap
 * finally closed), news moderation, and a real DISPUTED match ruled on by
 * a platform operator through the same adminResolveDispute machinery the
 * club queue uses.
 */
describe('Platform Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const users: Record<string, TestUser> = {
    alice: { email: `e2e-pa-alice-${stamp}@test.com`, token: '', id: '' },
    bob: { email: `e2e-pa-bob-${stamp}@test.com`, token: '', id: '' },
  };
  const adminEmail = `e2e-pa-staff-${stamp}@test.com`;
  const adminRoleName = `E2E Full Access ${stamp}`;
  const adminPassword = 'staff-password-1';
  let adminToken = '';

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch',
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
      firstName: user.email.startsWith('e2e-pa-alice') ? 'Alice' : 'Bob',
      lastName: 'Tester',
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

  /** Challenge → accept → propose → accept-time → SCHEDULED. */
  async function scheduleMatch(challenger: TestUser, opponent: TestUser) {
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
    await authed(
      opponent.token,
      'patch',
      `/matches/${matchId}/proposals/accept`,
    )
      .send({ optionId: proposed.body.latestProposal.options[0].id })
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

    // The bootstrap script's work, done directly so the suite owns its data.
    const role = await prisma.platformRole.upsert({
      where: { name: adminRoleName },
      create: {
        name: adminRoleName,
        description: 'E2E full-access platform role',
        permissions: {
          create: Object.values(PlatformPermission).map((permission) => ({
            permission,
          })),
        },
      },
      update: {},
    });
    await prisma.platformRolePermission.createMany({
      data: Object.values(PlatformPermission).map((permission) => ({
        roleId: role.id,
        permission,
      })),
      skipDuplicates: true,
    });
    await prisma.platformAdmin.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 4),
        name: 'E2E Staff',
        roleId: role.id,
      },
      update: { roleId: role.id, deactivatedAt: null },
    });

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
      await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
      await prisma.verificationCode.deleteMany({
        where: { userId: record.id },
      });
      await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
      await prisma.user.delete({ where: { id: record.id } });
    }
    await prisma.adminAuditLog.deleteMany({
      where: { actor: { email: adminEmail } },
    });
    await prisma.newsStory.deleteMany({
      where: { source: { name: `E2E Source ${stamp}` } },
    });
    await prisma.newsSource.deleteMany({
      where: { name: `E2E Source ${stamp}` },
    });
    await prisma.platformAdmin.deleteMany({ where: { email: adminEmail } });
    await prisma.platformRole.deleteMany({ where: { name: adminRoleName } });
    await app.close();
  }, 60_000);

  it('logs staff in and keeps the two token families isolated', async () => {
    await request(app.getHttpServer())
      .post('/platform-admin/auth/login')
      .send({ email: adminEmail, password: 'wrong-password' })
      .expect(401);

    const login = await request(app.getHttpServer())
      .post('/platform-admin/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    expect(login.body.challengeToken).toBeDefined();
    expect(login.body.devVerificationCode).toBeDefined();
    const verified = await request(app.getHttpServer())
      .post('/platform-admin/auth/verify-2fa')
      .send({
        challengeToken: login.body.challengeToken,
        code: login.body.devVerificationCode,
      })
      .expect(200);
    expect(verified.body.accessToken).toBeDefined();
    adminToken = verified.body.accessToken;

    // A player token can never open a platform route...
    await authed(users.alice.token, 'get', '/platform-admin/users').expect(401);
    // ...and a platform token can never open a player route.
    await authed(adminToken, 'get', '/users/me').expect(401);
  });

  it('lists users and suspends one for real', async () => {
    const list = await authed(adminToken, 'get', '/platform-admin/users')
      .query({ query: users.alice.email })
      .expect(200);
    expect(list.body.total).toBeGreaterThanOrEqual(1);
    expect(list.body.users[0].email).toBe(users.alice.email);

    await authed(
      adminToken,
      'patch',
      `/platform-admin/users/${users.alice.id}/status`,
    )
      .send({ status: 'SUSPENDED' })
      .expect(200);

    // Suspension blocks login...
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: users.alice.email, password })
      .expect(401);
    // ...and kills live sessions within the access token's TTL.
    await authed(users.alice.token, 'get', '/users/me').expect(401);

    await authed(
      adminToken,
      'patch',
      `/platform-admin/users/${users.alice.id}/status`,
    )
      .send({ status: 'ACTIVE' })
      .expect(200);
    await authed(users.alice.token, 'get', '/users/me').expect(200);
  });

  it('triages a player report end to end', async () => {
    const created = await authed(users.bob.token, 'post', '/safety/reports')
      .send({
        reportedUserId: users.alice.id,
        reason: 'SPAM',
        notes: 'E2E triage report',
      })
      .expect(201);

    const listed = await authed(
      adminToken,
      'get',
      '/platform-admin/reports/player',
    )
      .query({ status: 'OPEN' })
      .expect(200);
    const row = listed.body.reports.find(
      (r: any) => r.id === created.body.reportId,
    );
    expect(row).toBeDefined();
    expect(row.reporter.email).toBe(users.bob.email);

    await authed(
      adminToken,
      'patch',
      `/platform-admin/reports/player/${created.body.reportId}`,
    )
      .send({ status: 'RESOLVED' })
      .expect(200);

    const after = await prisma.playerReport.findUnique({
      where: { id: created.body.reportId },
    });
    expect(after?.status).toBe('RESOLVED');
  });

  it('manages news sources and moderates stories', async () => {
    const sourceName = `E2E Source ${stamp}`;
    const source = await authed(
      adminToken,
      'post',
      '/platform-admin/news/sources',
    )
      .send({ name: sourceName, feedUrl: null, status: 'ACTIVE' })
      .expect(201);
    expect(source.body.status).toBe('ACTIVE');

    // SSRF policy: a feed URL pointing at a private/loopback address or a
    // non-HTTPS scheme is rejected at write time.
    await authed(adminToken, 'post', '/platform-admin/news/sources')
      .send({
        name: `${sourceName} bad`,
        feedUrl: 'http://169.254.169.254/latest/meta-data/',
        status: 'ACTIVE',
      })
      .expect(400);

    const story = await prisma.newsStory.create({
      data: {
        sourceId: source.body.id,
        headline: `E2E story ${stamp}`,
        highlight: 'Pending moderation.',
        originalUrl: 'https://example.test/e2e-story',
        publicationDate: new Date(),
        categories: ['LATEST'],
        topics: [],
        moderationStatus: 'PENDING',
      },
    });

    await authed(
      adminToken,
      'patch',
      `/platform-admin/news/stories/${story.id}/moderation`,
    )
      .send({ moderationStatus: 'APPROVED' })
      .expect(200);

    const after = await prisma.newsStory.findUnique({
      where: { id: story.id },
    });
    expect(after?.moderationStatus).toBe('APPROVED');

    // Cleanup of the story happens in afterAll alongside the source.
  });

  it('rules on a genuinely disputed match', async () => {
    const { alice, bob } = users;
    const matchId = await scheduleMatch(alice, bob);

    await authed(alice.token, 'post', `/matches/${matchId}/results`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 6, sideBGames: 3 }] })
      .expect(201);
    await authed(bob.token, 'patch', `/matches/${matchId}/results/dispute`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 3, sideBGames: 6 }] })
      .expect(200);

    const queue = await authed(
      adminToken,
      'get',
      '/platform-admin/disputes',
    ).expect(200);
    const entry = queue.body.disputes.find((d: any) => d.matchId === matchId);
    expect(entry).toBeDefined();

    const ruled = await authed(
      adminToken,
      'post',
      `/platform-admin/disputes/${matchId}/rule`,
    )
      .send({ ruling: 'SUBMITTED' })
      .expect(201);
    expect(ruled.body.state).toBe('COMPLETED');
    expect(ruled.body.result.status).toBe('CONFIRMED');
  });

  it('writes an audit trail for every consequential action', async () => {
    const logs = await authed(
      adminToken,
      'get',
      '/platform-admin/audit-logs',
    ).expect(200);
    const actions = logs.body.map((l: { action: string }) => l.action);
    expect(actions).toContain('user.suspend');
    expect(actions).toContain('report.resolved');
    expect(actions).toContain('news_source.create');
    expect(actions).toContain('story.approved');
    expect(actions).toContain('dispute.resolve');
  });
});
