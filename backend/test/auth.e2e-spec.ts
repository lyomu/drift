import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@test.com`;
  const password = 'password123';

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
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
      await prisma.tennisProfile.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  it('completes the signup -> verify -> login -> /users/me -> refresh -> logout round trip', async () => {
    const signUpRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);

    expect(signUpRes.body.userId).toBeDefined();
    expect(signUpRes.body.devVerificationCode).toMatch(/^\d{6}$/);

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ email, code: signUpRes.body.devVerificationCode })
      .expect(200);

    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.refreshToken).toBeDefined();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { accessToken, refreshToken } = loginRes.body;

    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);
    expect(meRes.body.passwordHash).toBeUndefined();

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshRes.body.accessToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(200);
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects /users/me without a token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('answers forgot-password identically for an address with no account', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: `nobody-${Date.now()}@test.com` })
      .expect(200);

    // Same 200 as a real account, and crucially no code comes back.
    expect(res.body.devVerificationCode).toBeUndefined();
  });

  // Last in the file on purpose — it changes the password this suite's
  // account logs in with.
  it('completes forgot-password -> reset-password -> login with the new password', async () => {
    const newPassword = 'brand-new-password456';

    const forgotRes = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(200);

    // A pending SIGNUP code already exists for this account; the reset flow
    // issues its own PASSWORD_RESET code rather than reusing it.
    expect(forgotRes.body.devVerificationCode).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        email,
        code: forgotRes.body.devVerificationCode,
        newPassword,
      })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(401);
  });
});
