import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/** Tennis News against live Postgres with an isolated, rights-cleared fixture. */
describe('News (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const sourceId = `e2e-news-source-${stamp}`;
  const clinicId = `e2e-news-clinic-${stamp}`;
  const africaId = `e2e-news-africa-${stamp}`;
  const categorySlug = `E2E_NEWS_${stamp}`;
  const alice = { email: `e2e-m11-alice-${stamp}@test.com`, token: '', id: '' };
  const password = 'password123';

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

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
    await prisma.newsCategoryConfig.create({
      data: {
        slug: categorySlug,
        label: 'E2E News',
        enabled: true,
      },
    });

    const signUp = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: alice.email,
        password,
        firstName: 'Test',
        lastName: 'User',
        acceptedAgePolicy: true,
      })
      .expect(201);
    const verify = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ email: alice.email, code: signUp.body.devVerificationCode })
      .expect(200);
    alice.token = verify.body.accessToken;
    alice.id = signUp.body.userId;

    await prisma.newsSource.create({
      data: {
        id: sourceId,
        name: 'E2E Tennis Publisher',
        status: 'ACTIVE',
        nextPollAt: new Date('2100-01-01T00:00:00Z'),
        feedUrl: 'https://publisher.example/feed',
        rights: {
          create: {
            status: 'APPROVED',
            permissionReference: 'Controlled test fixture',
            commercialUseAllowed: true,
            headlineAllowed: true,
            excerptAllowed: true,
            cacheAllowed: true,
            attributionText: 'E2E Tennis Publisher',
            reviewedBy: 'e2e-test',
            reviewedAt: new Date(),
          },
        },
        stories: {
          create: [
            {
              id: clinicId,
              headline: 'Test tennis serve clinic',
              highlight: 'A controlled fixture for the news feed.',
              originalUrl: 'https://publisher.example/tennis/clinic',
              publicationDate: new Date(),
              categories: ['LATEST', 'LOCAL', categorySlug],
              topics: ['coaching'],
              moderationStatus: 'APPROVED',
              publishedAt: new Date(),
            },
            {
              id: africaId,
              headline: 'Test African tennis programme',
              highlight: 'A second controlled fixture for category filtering.',
              originalUrl: 'https://publisher.example/tennis/africa',
              publicationDate: new Date(Date.now() - 60_000),
              categories: ['AFRICA', categorySlug],
              topics: ['development'],
              moderationStatus: 'APPROVED',
              publishedAt: new Date(),
            },
          ],
        },
      },
    });
  }, 60_000);

  afterAll(async () => {
    const record = await prisma.user.findUnique({
      where: { email: alice.email },
    });
    if (record) {
      await prisma.savedStory.deleteMany({ where: { userId: record.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: record.id } });
      await prisma.verificationCode.deleteMany({
        where: { userId: record.id },
      });
      await prisma.user.delete({ where: { id: record.id } });
    }
    await prisma.newsSource.deleteMany({ where: { id: sourceId } });
    await prisma.newsCategoryConfig.deleteMany({
      where: { slug: categorySlug },
    });
    await app.close();
  });

  it('browses rights-cleared stories with no filter', async () => {
    const feed = await authed(alice.token, 'get', '/news').expect(200);
    const ids = feed.body.stories.map((s: { id: string }) => s.id);
    expect(ids).toContain(clinicId);
    expect(ids).toContain(africaId);
  });

  it('filters by category', async () => {
    const africaOnly = await authed(
      alice.token,
      'get',
      '/news?category=AFRICA',
    ).expect(200);
    const ids = africaOnly.body.stories.map((s: { id: string }) => s.id);
    expect(ids).toContain(africaId);
    expect(ids).not.toContain(clinicId);
  });

  it('pages equal publication timestamps once each with a stable cursor', async () => {
    const clinic = await prisma.newsStory.findUniqueOrThrow({
      where: { id: clinicId },
    });
    await prisma.newsStory.update({
      where: { id: africaId },
      data: { publicationDate: clinic.publicationDate },
    });
    const first = await authed(
      alice.token,
      'get',
      `/news?category=${categorySlug}&take=1`,
    ).expect(200);
    expect(first.body.stories).toHaveLength(1);
    expect(first.body.nextCursor).toBeTruthy();
    const second = await authed(
      alice.token,
      'get',
      `/news?category=${categorySlug}&take=1&cursor=${encodeURIComponent(first.body.nextCursor)}`,
    ).expect(200);
    expect(second.body.stories).toHaveLength(1);
    expect(
      new Set([first.body.stories[0].id, second.body.stories[0].id]),
    ).toEqual(new Set([clinicId, africaId]));
    expect(second.body.nextCursor).toBeNull();
  });

  it('never exposes a full article body — only headline/highlight/originalUrl', async () => {
    const story = await authed(alice.token, 'get', `/news/${clinicId}`).expect(
      200,
    );

    expect(story.body.headline).toBe('Test tennis serve clinic');
    expect(story.body.originalUrl).toBe(
      'https://publisher.example/tennis/clinic',
    );
    expect(story.body).not.toHaveProperty('body');
    expect(story.body).not.toHaveProperty('fullText');
  });

  it('saves a story, lists it under Saved Stories, then unsaves it', async () => {
    await authed(alice.token, 'post', `/news/${africaId}/save`).expect(201);

    const saved = await authed(alice.token, 'get', '/news/saved').expect(200);
    expect(
      saved.body.stories.some((s: { id: string }) => s.id === africaId),
    ).toBe(true);

    const feedAfterSave = await authed(alice.token, 'get', '/news').expect(200);
    const savedFlag = feedAfterSave.body.stories.find(
      (s: { id: string }) => s.id === africaId,
    );
    expect(savedFlag.savedByViewer).toBe(true);

    await authed(alice.token, 'delete', `/news/${africaId}/save`).expect(200);

    const savedAfterUnsave = await authed(
      alice.token,
      'get',
      '/news/saved',
    ).expect(200);
    expect(
      savedAfterUnsave.body.stories.some(
        (s: { id: string }) => s.id === africaId,
      ),
    ).toBe(false);
  });

  it('withdraws stories from feed and detail when source rights are revoked', async () => {
    await authed(alice.token, 'post', `/news/${clinicId}/save`).expect(201);
    await prisma.newsSourceRights.update({
      where: { sourceId },
      data: { status: 'REVOKED' },
    });
    const feed = await authed(alice.token, 'get', '/news').expect(200);
    expect(
      feed.body.stories.some((s: { id: string }) => s.id === clinicId),
    ).toBe(false);
    await authed(alice.token, 'get', `/news/${clinicId}`).expect(404);
    const saved = await authed(alice.token, 'get', '/news/saved').expect(200);
    expect(
      saved.body.stories.some((s: { id: string }) => s.id === clinicId),
    ).toBe(false);
  });
});
