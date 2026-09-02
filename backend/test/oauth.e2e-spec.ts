import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { OAuthService, SocialLoginClaims } from './../src/auth/oauth.service';

/**
 * Drives the real HTTP contract for Phase 4. Only the provider verifier is
 * stubbed — signature checking is OAuthService's own unit test — because what
 * matters here is the account behaviour the mobile client depends on: which
 * status code comes back, what the 409 body looks like, and where a fresh
 * social user lands in onboarding.
 */
describe('Social sign-in (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const freshEmail = `oauth-fresh-${stamp}@test.com`;
  const verifiedEmail = `oauth-verified-${stamp}@test.com`;
  const unverifiedEmail = `oauth-unverified-${stamp}@test.com`;
  const password = 'password123';
  const emails = [freshEmail, verifiedEmail, unverifiedEmail];

  // Mutated per test to stand in for whatever the provider asserted.
  let claims: SocialLoginClaims;

  beforeAll(async () => {
    const oauthStub = {
      googleConfigured: true,
      appleConfigured: true,
      verifyGoogleIdToken: () => Promise.resolve(claims),
      verifyAppleIdentityToken: () => Promise.resolve(claims),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OAuthService)
      .useValue(oauthStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    for (const email of emails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) continue;
      await prisma.socialIdentity.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
      await prisma.tennisProfile.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  /** Signs up through the normal password flow, optionally verifying it. */
  async function createPasswordAccount(email: string, verify: boolean) {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);

    if (verify) {
      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ email, code: res.body.devVerificationCode })
        .expect(200);
    }
  }

  it('creates a verified social user that lands in onboarding, not an empty home', async () => {
    claims = {
      provider: 'GOOGLE',
      providerAccountId: `sub-fresh-${stamp}`,
      email: freshEmail,
      emailVerified: true,
      givenName: 'Ada',
      familyName: 'Lovelace',
    } as SocialLoginClaims;

    const res = await request(app.getHttpServer())
      .post('/auth/oauth/google')
      .send({ idToken: 'stub' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);

    expect(me.body.email).toBe(freshEmail);
    // The provider already proved the address — sending this user to the
    // verification screen would strand them with no code to enter.
    expect(me.body.onboardingStep).toBe('BASIC_PROFILE');
    expect(me.body.verificationStatus).toBe('VERIFIED');
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('returns the same account on a second sign-in rather than duplicating it', async () => {
    await request(app.getHttpServer())
      .post('/auth/oauth/google')
      .send({ idToken: 'stub' })
      .expect(200);

    const identities = await prisma.socialIdentity.findMany({
      where: { providerAccountId: `sub-fresh-${stamp}` },
    });
    expect(identities).toHaveLength(1);
  });

  it('auto-links when the provider and the existing account both verified the address', async () => {
    await createPasswordAccount(verifiedEmail, true);

    claims = {
      provider: 'GOOGLE',
      providerAccountId: `sub-verified-${stamp}`,
      email: verifiedEmail,
      emailVerified: true,
      givenName: null,
      familyName: null,
    } as SocialLoginClaims;

    await request(app.getHttpServer())
      .post('/auth/oauth/google')
      .send({ idToken: 'stub' })
      .expect(200);

    const user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
      include: { socialIdentities: true },
    });
    expect(user?.socialIdentities).toHaveLength(1);
    // Linking must not disturb the password the account already had.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: verifiedEmail, password })
      .expect(200);
  });

  it('answers 409 EMAIL_LINK_REQUIRED for an unverified account, then links on proof of password', async () => {
    await createPasswordAccount(unverifiedEmail, false);

    claims = {
      provider: 'GOOGLE',
      providerAccountId: `sub-unverified-${stamp}`,
      email: unverifiedEmail,
      emailVerified: true,
      givenName: null,
      familyName: null,
    } as SocialLoginClaims;

    const conflict = await request(app.getHttpServer())
      .post('/auth/oauth/google')
      .send({ idToken: 'stub' })
      .expect(409);

    // The mobile client branches on this code to raise the password prompt,
    // so the exact string is part of the contract.
    expect(conflict.body.code).toBe('EMAIL_LINK_REQUIRED');
    // And on this address to complete the link — Apple withholds the email
    // after the first authorization, so the client cannot always supply it.
    expect(conflict.body.email).toBe(unverifiedEmail);

    await request(app.getHttpServer())
      .post('/auth/oauth/link')
      .send({
        provider: 'GOOGLE',
        idToken: 'stub',
        email: unverifiedEmail,
        password: 'wrong-password',
      })
      .expect(401);

    const linked = await request(app.getHttpServer())
      .post('/auth/oauth/link')
      .send({
        provider: 'GOOGLE',
        idToken: 'stub',
        email: unverifiedEmail,
        password,
      })
      .expect(200);

    expect(linked.body.accessToken).toBeDefined();

    // Sign-in now goes straight through the identity, no prompt.
    await request(app.getHttpServer())
      .post('/auth/oauth/google')
      .send({ idToken: 'stub' })
      .expect(200);
  });
});
