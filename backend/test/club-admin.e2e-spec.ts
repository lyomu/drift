import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Club / Community Admin (Phase M14) against live Postgres — the core
 * loop: create a club (self-service, caller becomes OWNER) → invite a
 * member as ADMIN → create a league/season → generate fixtures → approve
 * a result → open + admin-resolve a dispute → confirm a non-member is
 * rejected throughout.
 */
describe('Club Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const owner = { email: `e2e-m14-owner-${stamp}@test.com`, token: '', id: '' };
  const admin = { email: `e2e-m14-admin-${stamp}@test.com`, token: '', id: '' };
  const outsider = {
    email: `e2e-m14-outsider-${stamp}@test.com`,
    token: '',
    id: '',
  };
  const playerA = {
    email: `e2e-m14-playerA-${stamp}@test.com`,
    token: '',
    id: '',
  };
  const playerB = {
    email: `e2e-m14-playerB-${stamp}@test.com`,
    token: '',
    id: '',
  };

  let clubId: string;
  let leagueId: string;
  let seasonId: string;

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  async function signUpOnly(user: {
    email: string;
    token: string;
    id: string;
  }) {
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
  }

  /** Players need a real TennisProfile to be ratable — the club admin
   * accounts don't, since they never play a match in this spec. */
  async function onboard(user: { email: string; token: string; id: string }) {
    await signUpOnly(user);
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

    await signUpOnly(owner);
    await signUpOnly(admin);
    await signUpOnly(outsider);
    await onboard(playerA);
    await onboard(playerB);
  }, 90_000);

  afterAll(async () => {
    if (clubId) {
      await prisma.announcement.deleteMany({ where: { clubId } });
      await prisma.clubMembership.deleteMany({ where: { clubId } });
      const leagues = await prisma.league.findMany({ where: { clubId } });
      for (const league of leagues) {
        const seasons = await prisma.season.findMany({
          where: { leagueId: league.id },
        });
        for (const season of seasons) {
          await prisma.standing.deleteMany({ where: { seasonId: season.id } });
          await prisma.fixture.deleteMany({
            where: { round: { seasonId: season.id } },
          });
          await prisma.round.deleteMany({ where: { seasonId: season.id } });
          await prisma.seasonRegistration.deleteMany({
            where: { seasonId: season.id },
          });
        }
        await prisma.season.deleteMany({ where: { leagueId: league.id } });
      }
      await prisma.league.deleteMany({ where: { clubId } });
      await prisma.club.delete({ where: { id: clubId } });
    }

    for (const user of [owner, admin, outsider, playerA, playerB]) {
      const record = await prisma.user.findUnique({
        where: { email: user.email },
      });
      if (!record) continue;
      const tennisProfile = await prisma.tennisProfile.findUnique({
        where: { userId: record.id },
      });
      await prisma.matchResult.deleteMany({
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
      await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
      await prisma.user.delete({ where: { id: record.id } });
    }
    await app.close();
  });

  it('creates a club — the caller becomes OWNER', async () => {
    const created = await authed(owner.token, 'post', '/clubs')
      .send({ name: `E2E Tennis Club ${stamp}` })
      .expect(201);
    clubId = created.body.id;

    const memberships = await authed(
      owner.token,
      'get',
      '/clubs/me/memberships',
    ).expect(200);
    expect(memberships.body.memberships).toEqual([
      expect.objectContaining({ clubId, role: 'OWNER' }),
    ]);
  });

  it('rejects a non-member from managing the club', async () => {
    await authed(outsider.token, 'patch', `/clubs/${clubId}`)
      .send({ name: 'Hijacked' })
      .expect(403);
  });

  it('submits a verification request, UNVERIFIED -> PENDING', async () => {
    const result = await authed(
      owner.token,
      'post',
      `/clubs/${clubId}/verification-request`,
    ).expect(201);
    expect(result.body.verificationStatus).toBe('PENDING');
  });

  it('invites an existing Drift user as ADMIN', async () => {
    await authed(owner.token, 'post', `/clubs/${clubId}/members`)
      .send({ email: admin.email, role: 'ADMIN' })
      .expect(201);

    const members = await authed(
      owner.token,
      'get',
      `/clubs/${clubId}/members`,
    ).expect(200);
    expect(
      members.body.members.some(
        (m: { email: string; role: string }) =>
          m.email === admin.email && m.role === 'ADMIN',
      ),
    ).toBe(true);
  });

  it('the new ADMIN can now manage the club too', async () => {
    await authed(admin.token, 'patch', `/clubs/${clubId}`)
      .send({ description: 'Added by the admin' })
      .expect(200);
  });

  it('creates a league and a season as ADMIN', async () => {
    const league = await authed(admin.token, 'post', `/clubs/${clubId}/leagues`)
      .send({ name: 'E2E League' })
      .expect(201);
    leagueId = league.body.id;
    expect(league.body.sport).toBe('TENNIS');

    const now = Date.now();
    const season = await authed(
      admin.token,
      'post',
      `/leagues/${leagueId}/seasons`,
    )
      .send({
        label: 'Season 1',
        registrationOpensAt: new Date(now - 60_000).toISOString(),
        registrationClosesAt: new Date(now + 30_000).toISOString(),
        startsAt: new Date(now + 60 * 60 * 1000).toISOString(), // an hour from now
        roundCount: 1,
      })
      .expect(201);
    seasonId = season.body.id;
  });

  it('registers two players while registration is open', async () => {
    await authed(playerA.token, 'post', `/seasons/${seasonId}/register`).expect(
      201,
    );
    await authed(playerB.token, 'post', `/seasons/${seasonId}/register`).expect(
      201,
    );
  });

  it('generates fixtures early, once registration closes but before startsAt', async () => {
    // Close registration by moving registrationClosesAt into the past —
    // the admin-generate-fixtures path isn't gated on registration state,
    // only demonstrating it works well before startsAt (an hour away).
    await authed(admin.token, 'patch', `/seasons/${seasonId}`)
      .send({ registrationClosesAt: new Date(Date.now() - 1000).toISOString() })
      .expect(200);

    const generated = await authed(
      admin.token,
      'post',
      `/seasons/${seasonId}/generate-fixtures`,
    ).expect(201);
    expect(generated.body.round).not.toBeNull();
    expect(generated.body.round.fixtures).toHaveLength(1);
  });

  let fixtureId: string;
  let matchId: string;

  it('plays the fixture, then playerB disputes the submitted result', async () => {
    const round = await authed(
      admin.token,
      'get',
      `/seasons/${seasonId}/rounds/current`,
    ).expect(200);
    const fixture = round.body.round.fixtures[0];
    fixtureId = fixture.id;
    matchId = fixture.match.id;

    // Fixture-paired matches are created already SCHEDULING with both
    // sides ACCEPTED (system-paired, not a challenge) — no /accept step.
    const proposed = await authed(
      playerA.token,
      'post',
      `/matches/${matchId}/proposals`,
    )
      .send({ options: [new Date(Date.now() + 86_400_000).toISOString()] })
      .expect(201);
    const optionId = proposed.body.latestProposal.options[0].id;
    await authed(playerB.token, 'patch', `/matches/${matchId}/proposals/accept`)
      .send({ optionId })
      .expect(200);

    await authed(playerA.token, 'post', `/matches/${matchId}/results`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 6, sideBGames: 2 }] })
      .expect(201);
    await authed(playerB.token, 'patch', `/matches/${matchId}/results/dispute`)
      .send({ outcome: 'SCORE', sets: [{ sideAGames: 2, sideBGames: 6 }] })
      .expect(200);

    const match = await authed(
      playerA.token,
      'get',
      `/matches/${matchId}`,
    ).expect(200);
    expect(match.body.state).toBe('DISPUTED');
  });

  it('the disputes queue lists it for the club, but not for an outsider', async () => {
    await authed(outsider.token, 'get', `/clubs/${clubId}/disputes`).expect(
      403,
    );

    const disputes = await authed(
      admin.token,
      'get',
      `/clubs/${clubId}/disputes`,
    ).expect(200);
    expect(
      disputes.body.disputes.some(
        (d: { fixtureId: string }) => d.fixtureId === fixtureId,
      ),
    ).toBe(true);
  });

  it('an admin ruling resolves the dispute in favour of the original submitter', async () => {
    await authed(outsider.token, 'patch', `/disputes/${fixtureId}/resolve`)
      .send({ ruling: 'SUBMITTED' })
      .expect(403);

    await authed(admin.token, 'patch', `/disputes/${fixtureId}/resolve`)
      .send({ ruling: 'SUBMITTED' })
      .expect(200);

    const match = await authed(
      playerA.token,
      'get',
      `/matches/${matchId}`,
    ).expect(200);
    expect(match.body.state).toBe('COMPLETED');

    // playerA submitted 6-2 in their own favour — the SUBMITTED ruling
    // settles in playerA's favour, a real rating change through the same
    // Elo engine every player-driven confirm uses.
    const stats = await authed(playerA.token, 'get', '/me/stats').expect(200);
    expect(stats.body.singles.wins).toBe(1);
  });
});
