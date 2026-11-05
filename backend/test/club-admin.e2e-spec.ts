import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Club / Community Admin (Phase M14) against live Postgres — the core
 * loop: create a club (self-service, caller becomes OWNER) → invite a
 * member as ADMIN → create a league → generate fixtures → approve
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

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
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
      .send({
        email: user.email,
        password,
        firstName: 'Test',
        lastName: 'User',
        acceptedAgePolicy: true,
      })
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
        await prisma.standing.deleteMany({ where: { leagueId: league.id } });
        await prisma.fixture.deleteMany({
          where: { round: { leagueId: league.id } },
        });
        await prisma.round.deleteMany({ where: { leagueId: league.id } });
        await prisma.leagueRegistration.deleteMany({
          where: { leagueId: league.id },
        });
      }
      await prisma.league.deleteMany({ where: { clubId } });
      // Cascades the court's groups, opening hours and bookings.
      await prisma.court.deleteMany({ where: { clubId } });
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

  it('provisions a club with the caller as OWNER', async () => {
    // Self-serve `POST /clubs` was replaced by the request → approval →
    // setup-link flow (see `club-onboarding/`). This suite isn't testing that
    // flow, so it seeds the finished state directly.
    const club = await prisma.club.create({
      data: {
        name: `E2E Tennis Club ${stamp}`,
        platformStatus: 'ACTIVE',
        setupCompletedAt: new Date(),
      },
    });
    clubId = club.id;
    await prisma.clubMembership.create({
      data: { clubId, userId: owner.id, role: 'OWNER', status: 'ACTIVE' },
    });

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

  it('creates a league as ADMIN with a competition window', async () => {
    const now = Date.now();
    const league = await authed(admin.token, 'post', `/clubs/${clubId}/leagues`)
      .send({
        name: 'E2E League',
        registrationOpensAt: new Date(now - 60_000).toISOString(),
        registrationClosesAt: new Date(now + 30_000).toISOString(),
        startsAt: new Date(now + 60 * 60 * 1000).toISOString(), // an hour from now
        roundCount: 1,
      })
      .expect(201);
    leagueId = league.body.id;
    expect(league.body.sport).toBe('TENNIS');
  });

  it('registers two players while registration is open', async () => {
    await authed(playerA.token, 'post', `/leagues/${leagueId}/register`).expect(
      201,
    );
    await authed(playerB.token, 'post', `/leagues/${leagueId}/register`).expect(
      201,
    );
  });

  it('lets an admin add a club member to the waitlist, but only members and only managers', async () => {
    const path = `/leagues/${leagueId}/registrations`;

    // Not a manager of this club.
    await authed(outsider.token, 'post', path)
      .send({ userId: owner.id, status: 'WAITLISTED' })
      .expect(403);
    // playerA is registered but never joined the club, so cannot be added.
    await authed(admin.token, 'post', path)
      .send({ userId: playerA.id, status: 'ENROLLED' })
      .expect(400);
    // WITHDRAWN is not a way to add someone.
    await authed(admin.token, 'post', path)
      .send({ userId: owner.id, status: 'WITHDRAWN' })
      .expect(400);

    const added = await authed(admin.token, 'post', path)
      .send({ userId: owner.id, status: 'WAITLISTED' })
      .expect(201);
    expect(added.body.status).toBe('WAITLISTED');

    const players = await authed(
      admin.token,
      'get',
      `/leagues/${leagueId}/registrations`,
    ).expect(200);
    expect(
      players.body.players.some(
        (p: { status: string; player: { id: string } }) =>
          p.player.id === owner.id && p.status === 'WAITLISTED',
      ),
    ).toBe(true);
  });

  it('generates fixtures early, once registration closes but before startsAt', async () => {
    // Close registration by moving registrationClosesAt into the past —
    // the admin-generate-fixtures path isn't gated on registration state,
    // only demonstrating it works well before startsAt (an hour away).
    await authed(admin.token, 'patch', `/leagues/${leagueId}`)
      .send({ registrationClosesAt: new Date(Date.now() - 1000).toISOString() })
      .expect(200);

    const generated = await authed(
      admin.token,
      'post',
      `/leagues/${leagueId}/generate-fixtures`,
    ).expect(201);
    expect(generated.body.round).not.toBeNull();
    expect(generated.body.round.fixtures).toHaveLength(1);
  });

  it('lists the league rounds with their fixture progress', async () => {
    const res = await authed(
      playerA.token,
      'get',
      `/leagues/${leagueId}/rounds`,
    ).expect(200);
    expect(res.body.rounds).toHaveLength(1);
    expect(res.body.rounds[0]).toMatchObject({
      index: 1,
      fixtureCount: 1,
      playedCount: 0,
    });
    expect(res.body.rounds[0].id).toEqual(expect.any(String));
  });

  it('refuses admin result entry from non-managers and before the match is scheduled', async () => {
    const round = await authed(
      admin.token,
      'get',
      `/leagues/${leagueId}/rounds/current`,
    ).expect(200);
    const fixture = round.body.round.fixtures[0];
    const path = `/fixtures/${fixture.id}/result`;
    const score = {
      outcome: 'SCORE',
      sets: [
        { sideAGames: 6, sideBGames: 2 },
        { sideAGames: 6, sideBGames: 2 },
      ],
    };

    await authed(outsider.token, 'post', path).send(score).expect(403);
    await authed(playerA.token, 'post', path).send(score).expect(403);
    // The match is still being scheduled: a score cannot skip the state machine.
    await authed(admin.token, 'post', path).send(score).expect(400);

    const match = await authed(
      playerA.token,
      'get',
      `/matches/${fixture.match.id}`,
    ).expect(200);
    expect(match.body.state).toBe('SCHEDULING');
  });

  let fixtureId: string;
  let matchId: string;

  it('plays the fixture, then playerB disputes the submitted result', async () => {
    const round = await authed(
      admin.token,
      'get',
      `/leagues/${leagueId}/rounds/current`,
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
      .send({ outcome: 'SCORE', sets: [
        { sideAGames: 6, sideBGames: 2 },
        { sideAGames: 6, sideBGames: 2 },
      ] })
      .expect(201);
    await authed(playerB.token, 'patch', `/matches/${matchId}/results/dispute`)
      .send({ outcome: 'SCORE', sets: [
        { sideAGames: 2, sideBGames: 6 },
        { sideAGames: 2, sideBGames: 6 },
      ] })
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

  it('reports the open dispute in the attention counts, by role', async () => {
    const mine = await authed(
      owner.token,
      'get',
      `/clubs/${clubId}/attention`,
    ).expect(200);
    expect(mine.body).toMatchObject({ openDisputes: 1 });
    expect(mine.body.total).toBeGreaterThanOrEqual(1);

    await authed(outsider.token, 'get', `/clubs/${clubId}/attention`).expect(
      403,
    );
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

  it('refuses to record an admin result over a confirmed one', async () => {
    await authed(admin.token, 'post', `/fixtures/${fixtureId}/result`)
      .send({ outcome: 'SCORE', sets: [
        { sideAGames: 0, sideBGames: 6 },
        { sideAGames: 0, sideBGames: 6 },
      ] })
      .expect(400);
  });

  it('reports member stats to managers only, and only for members', async () => {
    const path = `/clubs/${clubId}/members/${admin.id}/stats`;
    const stats = await authed(owner.token, 'get', path).expect(200);
    expect(stats.body).toMatchObject({
      windowDays: 90,
      matchesPlayed: 0,
      engagementScore: 0,
      engagementBand: 'INACTIVE',
    });

    await authed(outsider.token, 'get', path).expect(403);
    await authed(
      owner.token,
      'get',
      `/clubs/${clubId}/members/${outsider.id}/stats`,
    ).expect(404);
  });

  it('runs the native court booking loop: settings, request, approve, capacity, cancel', async () => {
    // A club court with one hard court.
    const created = await authed(owner.token, 'post', `/clubs/${clubId}/courts`)
      .send({
        name: `E2E Court ${stamp}`,
        courtGroups: [{ surface: 'HARD', count: 1 }],
      })
      .expect(201);
    const courtId: string = created.body.id;
    const settingsPath = `/clubs/${clubId}/courts/${courtId}/booking-settings`;
    const settings = {
      enabled: true,
      timezone: 'Africa/Nairobi',
      slotMinutes: 60,
      maxSlots: 3,
      advanceDays: 30,
      hours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        opensMinute: 480,
        closesMinute: 1080,
      })),
    };

    // Not bookable until switched on.
    const day = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await authed(
      playerA.token,
      'get',
      `/courts/${courtId}/availability?date=${day}`,
    ).expect(404);

    // Only managers may edit settings; overlapping hours are rejected.
    await authed(playerA.token, 'put', settingsPath).send(settings).expect(403);
    await authed(owner.token, 'put', settingsPath)
      .send({
        ...settings,
        hours: [
          { dayOfWeek: 1, opensMinute: 480, closesMinute: 720 },
          { dayOfWeek: 1, opensMinute: 600, closesMinute: 900 },
        ],
      })
      .expect(400);
    const saved = await authed(owner.token, 'put', settingsPath)
      .send(settings)
      .expect(200);
    expect(saved.body.enabled).toBe(true);
    expect(saved.body.hours).toHaveLength(7);

    // Players see a slot grid.
    const avail = await authed(
      playerA.token,
      'get',
      `/courts/${courtId}/availability?date=${day}`,
    ).expect(200);
    expect(avail.body.slots).toHaveLength(10);
    const groupId: string = avail.body.groupId;

    const startsAt = `${day}T07:00:00.000Z`; // 10:00 Nairobi
    const endsAt = `${day}T08:00:00.000Z`;
    const requested = await authed(
      playerA.token,
      'post',
      `/courts/${courtId}/bookings`,
    )
      .send({ courtGroupId: groupId, startsAt, endsAt, note: 'Doubles' })
      .expect(201);
    expect(requested.body.booking.status).toBe('PENDING');
    // Outside hours is rejected.
    await authed(playerA.token, 'post', `/courts/${courtId}/bookings`)
      .send({
        courtGroupId: groupId,
        startsAt: `${day}T00:00:00.000Z`,
        endsAt: `${day}T01:00:00.000Z`,
      })
      .expect(400);

    // The club sees it and the attention badge counts it.
    const attention = await authed(
      owner.token,
      'get',
      `/clubs/${clubId}/attention`,
    ).expect(200);
    expect(attention.body.pendingBookings).toBeGreaterThanOrEqual(1);
    const bookingId: string = requested.body.booking.id;
    await authed(
      playerA.token,
      'patch',
      `/clubs/${clubId}/bookings/${bookingId}`,
    )
      .send({ decision: 'APPROVE' })
      .expect(403);

    // A second player requests the same slot (pending does not block it).
    const rival = await authed(
      playerB.token,
      'post',
      `/courts/${courtId}/bookings`,
    )
      .send({ courtGroupId: groupId, startsAt, endsAt })
      .expect(201);

    // Approving the first fills the only court; the rival can no longer be approved.
    await authed(owner.token, 'patch', `/clubs/${clubId}/bookings/${bookingId}`)
      .send({ decision: 'APPROVE' })
      .expect(200);
    await authed(
      owner.token,
      'patch',
      `/clubs/${clubId}/bookings/${rival.body.booking.id}`,
    )
      .send({ decision: 'APPROVE' })
      .expect(409);
    await authed(
      owner.token,
      'patch',
      `/clubs/${clubId}/bookings/${rival.body.booking.id}`,
    )
      .send({ decision: 'DECLINE', note: 'Court is taken' })
      .expect(200);

    // The slot now shows as full.
    const full = await authed(
      playerB.token,
      'get',
      `/courts/${courtId}/availability?date=${day}&groupId=${groupId}`,
    ).expect(200);
    const taken = full.body.slots.find(
      (s: { startsAt: string }) => s.startsAt === startsAt,
    );
    expect(taken).toMatchObject({ remaining: 0, available: false });

    // My bookings, and another player cannot cancel it.
    const mine = await authed(playerA.token, 'get', '/me/bookings').expect(200);
    expect(mine.body.bookings[0]).toMatchObject({
      id: bookingId,
      status: 'APPROVED',
    });
    await authed(
      playerB.token,
      'post',
      `/me/bookings/${bookingId}/cancel`,
    ).expect(404);

    // Staff-entered walk-in: refused on a full slot, instant on a free one.
    await authed(owner.token, 'post', `/clubs/${clubId}/bookings`)
      .send({
        courtId,
        courtGroupId: groupId,
        startsAt,
        endsAt,
        guestName: 'Walk-in',
      })
      .expect(409);
    const walkIn = await authed(
      owner.token,
      'post',
      `/clubs/${clubId}/bookings`,
    )
      .send({
        courtId,
        courtGroupId: groupId,
        startsAt: `${day}T08:00:00.000Z`,
        endsAt: `${day}T09:00:00.000Z`,
        guestName: 'Walk-in',
      })
      .expect(201);
    expect(walkIn.body.booking.status).toBe('APPROVED');

    // Club cancels the approved one; the slot frees up.
    await authed(
      owner.token,
      'post',
      `/clubs/${clubId}/bookings/${bookingId}/cancel`,
    )
      .send({ note: 'Maintenance' })
      .expect(201);
    const after = await authed(playerA.token, 'get', '/me/bookings').expect(
      200,
    );
    expect(after.body.bookings[0]).toMatchObject({
      status: 'CANCELLED',
      cancelledBy: 'CLUB',
    });

    // Analytics expose real numbers.
    const from = new Date(Date.now() - 86_400_000).toISOString();
    const to = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const courts = await authed(
      owner.token,
      'get',
      `/clubs/${clubId}/analytics/courts?from=${from}&to=${to}`,
    ).expect(200);
    const row = courts.body.courts.find(
      (c: { id: string }) => c.id === courtId,
    );
    expect(row).toHaveProperty('bookingRequests');
    expect(row).toHaveProperty('utilisationPct');

    // Turning it off hides the court from players.
    await authed(owner.token, 'put', settingsPath)
      .send({ ...settings, enabled: false })
      .expect(200);
    await authed(
      playerA.token,
      'get',
      `/courts/${courtId}/availability?date=${day}`,
    ).expect(404);
  });

  it('an admin records a walkover on a second league and it settles', async () => {
    const now = Date.now();
    const created = await authed(
      admin.token,
      'post',
      `/clubs/${clubId}/leagues`,
    )
      .send({
        name: 'E2E League 2',
        registrationOpensAt: new Date(now - 60_000).toISOString(),
        registrationClosesAt: new Date(now + 30_000).toISOString(),
        startsAt: new Date(now + 60 * 60 * 1000).toISOString(),
        roundCount: 1,
      })
      .expect(201);
    const secondLeagueId = created.body.id;

    await authed(
      playerA.token,
      'post',
      `/leagues/${secondLeagueId}/register`,
    ).expect(201);
    await authed(
      playerB.token,
      'post',
      `/leagues/${secondLeagueId}/register`,
    ).expect(201);
    await authed(admin.token, 'patch', `/leagues/${secondLeagueId}`)
      .send({ registrationClosesAt: new Date(Date.now() - 1000).toISOString() })
      .expect(200);

    const generated = await authed(
      admin.token,
      'post',
      `/leagues/${secondLeagueId}/generate-fixtures`,
    ).expect(201);
    const fixture = generated.body.round.fixtures[0];

    // A walkover is the one outcome the state machine allows from SCHEDULING.
    const recorded = await authed(
      admin.token,
      'post',
      `/fixtures/${fixture.id}/result`,
    )
      .send({ outcome: 'WALKOVER', winningSide: 'A' })
      .expect(201);
    expect(recorded.body.state).toBe('WALKOVER');

    // Settled results are final, and the round list reflects the progress.
    await authed(admin.token, 'post', `/fixtures/${fixture.id}/result`)
      .send({ outcome: 'WALKOVER' })
      .expect(400);
    const rounds = await authed(
      playerA.token,
      'get',
      `/leagues/${secondLeagueId}/rounds`,
    ).expect(200);
    expect(rounds.body.rounds[0].playedCount).toBe(1);
  });
});
