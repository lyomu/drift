import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Tennis News & Content (Phase M11) against live Postgres, exercising the
 * seeded stories from `prisma/seed.ts`'s `seedNews()`. The seed script must
 * have been run at least once against this database before this spec runs.
 */
describe('News (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
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

    const signUp = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: alice.email, password })
      .expect(201);
    const verify = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ email: alice.email, code: signUp.body.devVerificationCode })
      .expect(200);
    alice.token = verify.body.accessToken;
    alice.id = signUp.body.userId;
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
    await app.close();
  });

  it('browses every seeded story with no filter', async () => {
    const feed = await authed(alice.token, 'get', '/news').expect(200);
    const ids = feed.body.stories.map((s: { id: string }) => s.id);
    expect(ids).toContain('seed-story-serve-clinic');
    expect(ids.length).toBeGreaterThanOrEqual(5);
  });

  it('filters by category', async () => {
    const africaOnly = await authed(
      alice.token,
      'get',
      '/news?category=AFRICA',
    ).expect(200);
    const ids = africaOnly.body.stories.map((s: { id: string }) => s.id);
    expect(ids).toContain('seed-story-african-tennis-development');
    expect(ids).not.toContain('seed-story-serve-clinic');
  });

  it('never exposes a full article body — only headline/highlight/originalUrl', async () => {
    const story = await authed(
      alice.token,
      'get',
      '/news/seed-story-serve-clinic',
    ).expect(200);

    expect(story.body.headline).toBe(
      'Weekend serve clinics popping up at local clubs',
    );
    expect(story.body.originalUrl).toBe(
      'https://example.com/drift-digest/serve-clinics',
    );
    expect(story.body).not.toHaveProperty('body');
    expect(story.body).not.toHaveProperty('fullText');
  });

  it('saves a story, lists it under Saved Stories, then unsaves it', async () => {
    await authed(
      alice.token,
      'post',
      '/news/seed-story-club-league-growth/save',
    ).expect(201);

    const saved = await authed(alice.token, 'get', '/news/saved').expect(200);
    expect(
      saved.body.stories.some(
        (s: { id: string }) => s.id === 'seed-story-club-league-growth',
      ),
    ).toBe(true);

    const feedAfterSave = await authed(alice.token, 'get', '/news').expect(200);
    const savedFlag = feedAfterSave.body.stories.find(
      (s: { id: string }) => s.id === 'seed-story-club-league-growth',
    );
    expect(savedFlag.savedByViewer).toBe(true);

    await authed(
      alice.token,
      'delete',
      '/news/seed-story-club-league-growth/save',
    ).expect(200);

    const savedAfterUnsave = await authed(
      alice.token,
      'get',
      '/news/saved',
    ).expect(200);
    expect(
      savedAfterUnsave.body.stories.some(
        (s: { id: string }) => s.id === 'seed-story-club-league-growth',
      ),
    ).toBe(false);
  });
});
