import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Wave 2 — the community loop against live Postgres: a player asks to join
 * a club → the request lands PENDING and is invisible to the community →
 * an owner approves → the member reads published announcements (never
 * drafts) → publishing notifies members but not the author → the member
 * posts to the feed and another member reacts.
 */
describe('Club Community (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const owner = {
    email: `e2e-comm-owner-${stamp}@test.com`,
    token: '',
    id: '',
  };
  const joiner = {
    email: `e2e-comm-joiner-${stamp}@test.com`,
    token: '',
    id: '',
  };
  const outsider = {
    email: `e2e-comm-out-${stamp}@test.com`,
    token: '',
    id: '',
  };

  let clubId: string;
  let membershipId: string;
  let draftId: string;
  let postId: string;

  const authed = (
    token: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  async function signUp(user: { email: string; token: string; id: string }) {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: user.email, password, acceptedAgePolicy: true })
      .expect(201);
    const verify = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ email: user.email, code: res.body.devVerificationCode })
      .expect(200);
    user.token = verify.body.accessToken;
    user.id = res.body.userId;
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

    await signUp(owner);
    await signUp(joiner);
    await signUp(outsider);

    // `POST /clubs` was replaced by the club-onboarding request flow; this
    // suite seeds the provisioned club directly.
    const club = await prisma.club.create({
      data: {
        name: `Community Club ${stamp}`,
        platformStatus: 'ACTIVE',
        setupCompletedAt: new Date(),
      },
    });
    clubId = club.id;
    await prisma.clubMembership.create({
      data: { clubId, userId: owner.id, role: 'OWNER', status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    if (clubId) {
      await prisma.clubPostReaction.deleteMany({
        where: { post: { clubId } },
      });
      await prisma.clubPost.deleteMany({ where: { clubId } });
      await prisma.announcement.deleteMany({ where: { clubId } });
      await prisma.clubMembership.deleteMany({ where: { clubId } });
      await prisma.club.delete({ where: { id: clubId } });
    }
    for (const user of [owner, joiner, outsider]) {
      if (!user.id) continue;
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.notificationPreference.deleteMany({
        where: { userId: user.id },
      });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
      await prisma.tennisProfile.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  it('locks a non-member out of announcements and the feed', async () => {
    await authed(
      outsider.token,
      'get',
      `/clubs/${clubId}/announcements`,
    ).expect(403);
    await authed(outsider.token, 'get', `/clubs/${clubId}/posts`).expect(403);
  });

  it('lands a join request as PENDING and notifies the owner', async () => {
    const res = await authed(
      joiner.token,
      'post',
      `/clubs/${clubId}/join`,
    ).expect(201);
    expect(res.body.status).toBe('PENDING');

    const notifications = await authed(owner.token, 'get', '/notifications');
    expect(
      notifications.body.notifications.some(
        (n: { category: string }) => n.category === 'CLUBS',
      ),
    ).toBe(true);
  });

  it('rejects a duplicate request while one is pending', async () => {
    await authed(joiner.token, 'post', `/clubs/${clubId}/join`).expect(400);
  });

  it('still refuses the community to a PENDING member', async () => {
    await authed(joiner.token, 'get', `/clubs/${clubId}/announcements`).expect(
      403,
    );
    await authed(joiner.token, 'get', `/clubs/${clubId}/posts`).expect(403);
  });

  it('surfaces the pending request in the admin member list', async () => {
    const res = await authed(
      owner.token,
      'get',
      `/clubs/${clubId}/members`,
    ).expect(200);

    const pending = res.body.members.find(
      (m: { status: string }) => m.status === 'PENDING',
    );
    expect(pending.email).toBe(joiner.email);
    membershipId = pending.membershipId;
  });

  it('lets the owner approve, and tells the joiner', async () => {
    await authed(
      owner.token,
      'patch',
      `/clubs/${clubId}/members/${membershipId}`,
    )
      .send({ status: 'ACTIVE' })
      .expect(200);

    const notifications = await authed(joiner.token, 'get', '/notifications');
    expect(
      notifications.body.notifications.some((n: { title: string }) =>
        n.title.includes("You've joined"),
      ),
    ).toBe(true);
  });

  it('hides drafts from a member but shows them to the owner', async () => {
    const draft = await authed(
      owner.token,
      'post',
      `/clubs/${clubId}/announcements`,
    )
      .send({ title: 'Draft only', body: 'Not ready', status: 'DRAFT' })
      .expect(201);
    draftId = draft.body.id;

    const asMember = await authed(
      joiner.token,
      'get',
      `/clubs/${clubId}/announcements`,
    ).expect(200);
    expect(asMember.body.announcements).toHaveLength(0);

    const asOwner = await authed(
      owner.token,
      'get',
      `/clubs/${clubId}/announcements`,
    ).expect(200);
    expect(asOwner.body.announcements).toHaveLength(1);
  });

  it('notifies members on publish, but never the author', async () => {
    await authed(
      owner.token,
      'patch',
      `/clubs/${clubId}/announcements/${draftId}`,
    )
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const memberFeed = await authed(joiner.token, 'get', '/notifications');
    const published = memberFeed.body.notifications.filter(
      (n: { relatedEntityType: string }) =>
        n.relatedEntityType === 'CLUB_ANNOUNCEMENT',
    );
    expect(published).toHaveLength(1);
    // Deep link must carry the club, not the announcement — the mobile
    // Announcements screen is club-scoped.
    expect(published[0].relatedEntityId).toBe(clubId);

    const ownerFeed = await authed(owner.token, 'get', '/notifications');
    expect(
      ownerFeed.body.notifications.some(
        (n: { relatedEntityType: string }) =>
          n.relatedEntityType === 'CLUB_ANNOUNCEMENT',
      ),
    ).toBe(false);
  });

  it('shows the published announcement to the member', async () => {
    const res = await authed(
      joiner.token,
      'get',
      `/clubs/${clubId}/announcements`,
    ).expect(200);
    expect(res.body.announcements).toHaveLength(1);
    expect(res.body.announcements[0].status).toBe('PUBLISHED');
  });

  it('lets a member post to the feed and another member react', async () => {
    const post = await authed(joiner.token, 'post', `/clubs/${clubId}/posts`)
      .send({ body: 'Anyone up for doubles Saturday?' })
      .expect(201);
    postId = post.body.id;

    await authed(
      owner.token,
      'post',
      `/clubs/${clubId}/posts/${postId}/reactions`,
    )
      .send({ emoji: '👍' })
      .expect(201);

    // Upsert — reacting twice must not double-count.
    await authed(
      owner.token,
      'post',
      `/clubs/${clubId}/posts/${postId}/reactions`,
    )
      .send({ emoji: '👍' })
      .expect(201);

    const feed = await authed(joiner.token, 'get', `/clubs/${clubId}/posts`);
    expect(feed.body.posts[0].reactions).toEqual([
      { emoji: '👍', count: 1, mine: false },
    ]);
    expect(feed.body.posts[0].isMine).toBe(true);
  });

  it('lets an owner moderate a post they did not write', async () => {
    await authed(
      owner.token,
      'delete',
      `/clubs/${clubId}/posts/${postId}`,
    ).expect(200);

    const feed = await authed(joiner.token, 'get', `/clubs/${clubId}/posts`);
    expect(feed.body.posts).toHaveLength(0);
  });

  it('shuts the community again once a member leaves', async () => {
    await authed(joiner.token, 'delete', `/clubs/${clubId}/join`).expect(200);
    await authed(joiner.token, 'get', `/clubs/${clubId}/posts`).expect(403);
  });

  it('refuses to let the last owner leave', async () => {
    await authed(owner.token, 'delete', `/clubs/${clubId}/join`).expect(400);
  });
});
