import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Court & Club discovery (Phase M9) against live Postgres, exercising the
 * seeded court/club set from `prisma/seed.ts` — same London coordinates
 * (51.5074, -0.1278) the other e2e specs use, so distance filtering is
 * trivially reasoned about. The seed script must have been run at least
 * once against this database before this spec runs.
 */
describe('Courts & Clubs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const alice = { email: `e2e-m9-alice-${stamp}@test.com`, token: '', id: '' };
  const bob = { email: `e2e-m9-bob-${stamp}@test.com`, token: '', id: '' };
  const password = 'password123';

  const LONDON = { latitude: 51.5074, longitude: -0.1278 };
  // Nairobi — genuinely far from every seeded court.
  const FAR_AWAY = { latitude: -1.2921, longitude: 36.8219 };

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
      latitude: LONDON.latitude,
      longitude: LONDON.longitude,
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
      await prisma.courtReport.deleteMany({ where: { reporterId: record.id } });
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
          proposal: {
            match: { participants: { some: { userId: record.id } } },
          },
        },
      });
      await prisma.timeProposal.deleteMany({
        where: { match: { participants: { some: { userId: record.id } } } },
      });
      await prisma.matchParticipant.deleteMany({
        where: { userId: record.id },
      });
      await prisma.match.deleteMany({ where: { createdById: record.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
      await prisma.verificationCode.deleteMany({
        where: { userId: record.id },
      });
      await prisma.tennisProfile.deleteMany({ where: { userId: record.id } });
      await prisma.user.delete({ where: { id: record.id } });
    }
    await app.close();
  });

  it('finds seeded courts near London with no filters', async () => {
    const search = await authed(
      alice.token,
      'get',
      `/courts?latitude=${LONDON.latitude}&longitude=${LONDON.longitude}&maxDistanceKm=50`,
    ).expect(200);

    expect(search.body.total).toBeGreaterThanOrEqual(10);
    expect(
      search.body.courts.some(
        (c: { id: string }) => c.id === 'seed-court-regents-park',
      ),
    ).toBe(true);
  });

  it('filters by surface through the CourtGroup table', async () => {
    const clayOnly = await authed(
      alice.token,
      'get',
      `/courts?latitude=${LONDON.latitude}&longitude=${LONDON.longitude}&maxDistanceKm=50&surfaces=CLAY`,
    ).expect(200);

    const ids = clayOnly.body.courts.map((c: { id: string }) => c.id);
    expect(ids).toContain('seed-court-islington-clay');
    // Regent's Park is all-hard — must be excluded by a clay-only filter.
    expect(ids).not.toContain('seed-court-regents-park');
  });

  it('returns zero results for a tiny radius around a far-away point', async () => {
    const search = await authed(
      alice.token,
      'get',
      `/courts?latitude=${FAR_AWAY.latitude}&longitude=${FAR_AWAY.longitude}&maxDistanceKm=5`,
    ).expect(200);

    expect(search.body.total).toBe(0);
    expect(search.body.courts).toHaveLength(0);
  });

  it('never fabricates missing court data — an UNKNOWN-booking court renders null, not guessed', async () => {
    const profile = await authed(
      alice.token,
      'get',
      '/courts/seed-court-islington-clay',
    ).expect(200);

    expect(profile.body.bookingType).toBe('UNKNOWN');
    expect(profile.body.bookingUrl).toBeNull();
    expect(profile.body.phone).toBeNull();
    expect(profile.body.website).toBeNull();
  });

  it("embeds a club's owned courts, and an independent court is still findable directly", async () => {
    const club = await authed(
      alice.token,
      'get',
      '/clubs/seed-club-hurlingham',
    ).expect(200);
    expect(
      club.body.courts.some(
        (c: { id: string }) => c.id === 'seed-court-hurlingham',
      ),
    ).toBe(true);

    const independent = await authed(
      alice.token,
      'get',
      '/courts/seed-court-highbury-club',
    ).expect(200);
    expect(independent.body.clubId).toBeNull();
  });

  it('a club with no courts renders an empty list, not an error', async () => {
    const club = await authed(
      alice.token,
      'get',
      '/clubs/seed-club-riverside',
    ).expect(200);
    expect(club.body.courts).toEqual([]);
  });

  it('accepts a court info report', async () => {
    const report = await authed(
      alice.token,
      'post',
      '/courts/seed-court-clapham-common/report',
    )
      .send({ reason: 'INCORRECT_INFO', notes: 'e2e test report' })
      .expect(201);

    expect(report.body.status).toBe('OPEN');

    const stored = await prisma.courtReport.findUnique({
      where: { id: report.body.reportId },
    });
    expect(stored).not.toBeNull();
    expect(stored?.reporterId).toBe(alice.id);
  });

  it('links a real court to a match via suggestCourt, alongside the free-text fields', async () => {
    const created = await authed(alice.token, 'post', '/matches')
      .send({ opponentId: bob.id, format: 'SINGLES' })
      .expect(201);
    const matchId = created.body.id;

    await authed(bob.token, 'patch', `/matches/${matchId}/accept`)
      .send({})
      .expect(200);

    const withCourt = await authed(
      alice.token,
      'patch',
      `/matches/${matchId}/court`,
    )
      .send({
        courtName: "Regent's Park Hard Courts",
        courtId: 'seed-court-regents-park',
      })
      .expect(200);

    expect(withCourt.body.courtName).toBe("Regent's Park Hard Courts");
    expect(withCourt.body.court).not.toBeNull();
    expect(withCourt.body.court.id).toBe('seed-court-regents-park');

    const fetched = await authed(
      alice.token,
      'get',
      `/matches/${matchId}`,
    ).expect(200);
    expect(fetched.body.court.id).toBe('seed-court-regents-park');
  });
});
