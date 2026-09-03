import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mail/mailer.service';
import { OAuthService } from './oauth.service';
import { PasswordPolicyService } from './password-policy';

type MockPrisma = {
  user: Record<string, jest.Mock>;
  verificationCode: Record<string, jest.Mock>;
  refreshToken: Record<string, jest.Mock>;
  socialIdentity: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    verificationCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    socialIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return prisma;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let oauth: {
    verifyGoogleIdToken: jest.Mock;
    verifyAppleIdentityToken: jest.Mock;
  };

  beforeEach(() => {
    prisma = createMockPrisma();
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    } as unknown as JwtService;
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          NODE_ENV: 'test',
          JWT_SECRET: 'secret',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '30d',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    const mailer = {
      enabled: false,
      sendVerificationCode: jest.fn().mockResolvedValue(false),
    } as unknown as MailerService;

    // Token verification is OAuthService's job and is tested there against
    // real signature/audience/nonce failures. Stubbing it here lets these
    // tests state the *verified claims* directly, which is the only input
    // the linking policy actually reasons about.
    oauth = {
      verifyGoogleIdToken: jest.fn(),
      verifyAppleIdentityToken: jest.fn(),
    };
    const passwordPolicy = {
      assertAcceptable: jest.fn().mockResolvedValue(undefined),
    } as unknown as PasswordPolicyService;

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
      config,
      mailer,
      oauth as unknown as OAuthService,
      passwordPolicy,
    );
  });

  describe('signUp', () => {
    it('creates a user + tennis profile + verification code and returns the dev code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.create.mockResolvedValue({});

      const result = await service.signUp({
        email: 'a@test.com',
        password: 'password123',
        acceptedAgePolicy: true,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'a@test.com',
            agePolicyAcceptedAt: expect.any(Date),
          }),
        }),
      );
      expect(prisma.verificationCode.create).toHaveBeenCalled();
      expect(result.userId).toBe('user-1');
      expect(result.devVerificationCode).toMatch(/^\d{6}$/);
    });

    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.signUp({
          email: 'a@test.com',
          password: 'password123',
          acceptedAgePolicy: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('requires the launch 18+ account policy acceptance', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.signUp({
          email: 'a@test.com',
          password: 'password123',
          acceptedAgePolicy: false as true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('rejects an incorrect code and increments attemptCount', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: await bcrypt.hash('111111', 4),
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
      });

      await expect(
        service.verify({ email: 'a@test.com', code: '999999' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attemptCount: { increment: 1 } } }),
      );
    });

    it('rejects an expired code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: await bcrypt.hash('111111', 4),
        expiresAt: new Date(Date.now() - 60_000),
        attemptCount: 0,
      });

      await expect(
        service.verify({ email: 'a@test.com', code: '111111' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('verifies with the correct code and issues tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: await bcrypt.hash('123456', 4),
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verify({
        email: 'a@test.com',
        code: '123456',
      });

      expect(result.accessToken).toBe('access-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: await bcrypt.hash('correct-password', 4),
      });

      await expect(
        service.login({ email: 'a@test.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues tokens with the correct password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: await bcrypt.hash('correct-password', 4),
        accountStatus: 'ACTIVE',
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'a@test.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('access-token');
    });

    it('rejects a deleted account without revealing it exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: await bcrypt.hash('correct-password', 4),
        accountStatus: 'DELETED',
      });

      await expect(
        service.login({ email: 'a@test.com', password: 'correct-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: await bcrypt.hash('correct-password', 4),
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong-password',
          newPassword: 'new-password123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('updates the password hash and revokes existing refresh tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: await bcrypt.hash('correct-password', 4),
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        currentPassword: 'correct-password',
        newPassword: 'new-password123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('refresh', () => {
    it('rotates a valid refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: { accountStatus: 'ACTIVE' },
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('some-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
      expect(result.accessToken).toBe('access-token');
    });

    it('rejects and revokes a refresh token for a suspended account', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: { accountStatus: 'SUSPENDED' },
      });
      prisma.refreshToken.update.mockResolvedValue({});

      await expect(
        service.refresh('some-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      // The dangling token is killed, not just refused.
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('rejects a revoked refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        user: { accountStatus: 'ACTIVE' },
      });

      await expect(
        service.refresh('some-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
  describe('forgotPassword', () => {
    it('issues a PASSWORD_RESET code for a live account and returns the dev code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue(null);
      prisma.verificationCode.create.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'a@test.com' });

      expect(result).toEqual({ devVerificationCode: expect.any(String) });
      expect(prisma.verificationCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            purpose: 'PASSWORD_RESET',
          }),
        }),
      );
    });

    it('resolves without creating a code for an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'nobody@test.com' }),
      ).resolves.toEqual({});
      expect(prisma.verificationCode.create).not.toHaveBeenCalled();
      expect(prisma.verificationCode.update).not.toHaveBeenCalled();
    });

    it('resolves without creating a code for a deleted account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
        accountStatus: 'DELETED',
      });

      await expect(
        service.forgotPassword({ email: 'a@test.com' }),
      ).resolves.toEqual({});
      expect(prisma.verificationCode.create).not.toHaveBeenCalled();
    });

    it('silently skips re-issuing inside the resend cooldown rather than throwing', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        lastSentAt: new Date(),
      });

      await expect(
        service.forgotPassword({ email: 'a@test.com' }),
      ).resolves.toEqual({});
      expect(prisma.verificationCode.update).not.toHaveBeenCalled();
      expect(prisma.verificationCode.create).not.toHaveBeenCalled();
    });

    it('reuses an existing unconsumed record instead of creating a second', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        lastSentAt: new Date(Date.now() - 120_000),
      });
      prisma.verificationCode.update.mockResolvedValue({});

      await service.forgotPassword({ email: 'a@test.com' });

      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'code-1' },
          data: expect.objectContaining({ attemptCount: 0 }),
        }),
      );
      expect(prisma.verificationCode.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('consumes the code, writes the new hash and revokes every refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: await bcrypt.hash('123456', 4),
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
      });
      prisma.verificationCode.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await service.resetPassword({
        email: 'a@test.com',
        code: '123456',
        newPassword: 'brand-new-password',
      });

      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'code-1' },
          data: { consumedAt: expect.any(Date) },
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { passwordHash: expect.stringMatching(/^\$2[aby]\$/) },
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('only ever looks at PASSWORD_RESET codes, never a pending signup code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'a@test.com',
          code: '123456',
          newPassword: 'brand-new-password',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.verificationCode.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ purpose: 'PASSWORD_RESET' }),
        }),
      );
    });

    it('rejects an expired code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: await bcrypt.hash('123456', 4),
        expiresAt: new Date(Date.now() - 60_000),
        attemptCount: 0,
      });

      await expect(
        service.resetPassword({
          email: 'a@test.com',
          code: '123456',
          newPassword: 'brand-new-password',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a wrong code and increments attemptCount', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: await bcrypt.hash('123456', 4),
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
      });

      await expect(
        service.resetPassword({
          email: 'a@test.com',
          code: '999999',
          newPassword: 'brand-new-password',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attemptCount: { increment: 1 } } }),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects once the attempt cap is reached', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
      });
      prisma.verificationCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: await bcrypt.hash('123456', 4),
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 5,
      });

      await expect(
        service.resetPassword({
          email: 'a@test.com',
          code: '123456',
          newPassword: 'brand-new-password',
        }),
      ).rejects.toThrow('Too many attempts. Request a new code.');
    });

    it('rejects an unknown email with the same generic error', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'nobody@test.com',
          code: '123456',
          newPassword: 'brand-new-password',
        }),
      ).rejects.toThrow('Invalid or expired code.');
    });
  });

  describe('social sign-in', () => {
    const googleClaims = {
      provider: 'GOOGLE',
      providerAccountId: 'google-sub-1',
      email: 'social@test.com',
      emailVerified: true,
      givenName: 'Ada',
      familyName: 'Lovelace',
    };

    beforeEach(() => {
      oauth.verifyGoogleIdToken.mockResolvedValue(googleClaims);
      prisma.refreshToken.create.mockResolvedValue({});
    });

    it('signs a returning user in on the provider sub, not the email', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue({
        userId: 'user-1',
        user: { id: 'user-1', accountStatus: 'ACTIVE' },
      });

      const tokens = await service.oauthGoogle({ idToken: 'tok' });

      expect(tokens.accessToken).toBe('access-token');
      // Matching on `sub` alone is the point: no email lookup should happen,
      // so a user who changes their Google address keeps this account.
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('refuses a suspended account the same way login does', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue({
        userId: 'user-1',
        user: { id: 'user-1', accountStatus: 'SUSPENDED' },
      });

      await expect(service.oauthGoogle({ idToken: 'tok' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('creates a verified user straight into BASIC_PROFILE for a new email', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-new' });
      prisma.socialIdentity.create.mockResolvedValue({});

      await service.oauthGoogle({ idToken: 'tok', acceptedAgePolicy: true });

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.passwordHash).toBeNull();
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(data.agePolicyAcceptedAt).toBeInstanceOf(Date);
      expect(data.verificationStatus).toBe('VERIFIED');
      // The provider already proved the address, so this user must skip the
      // verification screen — landing on VERIFY would be a dead end for them.
      expect(data.onboardingStep).toBe('BASIC_PROFILE');
      expect(data.tennisProfile).toEqual({ create: {} });
    });

    it('persists the name on the creating write — Apple never sends it twice', async () => {
      oauth.verifyAppleIdentityToken.mockResolvedValue({
        ...googleClaims,
        provider: 'APPLE',
        providerAccountId: 'apple-sub-1',
      });
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-new' });
      prisma.socialIdentity.create.mockResolvedValue({});

      await service.oauthApple({
        identityToken: 'tok',
        acceptedAgePolicy: true,
      });

      expect(prisma.socialIdentity.create.mock.calls[0][0].data.name).toBe(
        'Ada Lovelace',
      );
    });

    it('auto-links only when both sides are verified', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        accountStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
      });
      prisma.socialIdentity.create.mockResolvedValue({});

      await service.oauthGoogle({ idToken: 'tok' });

      expect(prisma.socialIdentity.create).toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('demands the password when the existing account is unverified', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        accountStatus: 'ACTIVE',
        emailVerifiedAt: null,
      });

      await expect(service.oauthGoogle({ idToken: 'tok' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.socialIdentity.create).not.toHaveBeenCalled();
    });

    it('demands the password when the provider has not verified the address', async () => {
      oauth.verifyGoogleIdToken.mockResolvedValue({
        ...googleClaims,
        emailVerified: false,
      });
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        accountStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
      });

      await expect(service.oauthGoogle({ idToken: 'tok' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('requires age-policy acceptance only before creating a fresh social account', async () => {
      prisma.socialIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.oauthGoogle({ idToken: 'tok' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(oauth.verifyGoogleIdToken).toHaveBeenCalled();
    });
  });

  describe('oauthLink', () => {
    const linkDto = {
      provider: 'GOOGLE' as never,
      idToken: 'tok',
      email: 'social@test.com',
      password: 'correct-password',
    };

    beforeEach(() => {
      oauth.verifyGoogleIdToken.mockResolvedValue({
        provider: 'GOOGLE',
        providerAccountId: 'google-sub-1',
        email: 'social@test.com',
        emailVerified: true,
        givenName: null,
        familyName: null,
      });
      prisma.refreshToken.create.mockResolvedValue({});
    });

    it('links the identity and revokes other sessions once the password checks out', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        accountStatus: 'ACTIVE',
        emailVerifiedAt: null,
        passwordHash: await bcrypt.hash('correct-password', 4),
      });
      prisma.socialIdentity.findUnique.mockResolvedValue(null);

      await service.oauthLink(linkDto);

      expect(prisma.socialIdentity.upsert).toHaveBeenCalled();
      // A new way into the account is a credential change — other devices go.
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects a wrong password without touching the identity table', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        accountStatus: 'ACTIVE',
        emailVerifiedAt: null,
        passwordHash: await bcrypt.hash('correct-password', 4),
      });

      await expect(
        service.oauthLink({ ...linkDto, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.socialIdentity.upsert).not.toHaveBeenCalled();
    });

    it('refuses to link a token minted for a different address', async () => {
      // Without this check, anyone holding account B's password could attach
      // their own Google identity to it using a token issued for account A.
      await expect(
        service.oauthLink({ ...linkDto, email: 'someone.else@test.com' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('refuses when the identity already belongs to someone else', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        accountStatus: 'ACTIVE',
        emailVerifiedAt: null,
        passwordHash: await bcrypt.hash('correct-password', 4),
      });
      prisma.socialIdentity.findUnique.mockResolvedValue({
        userId: 'another-user',
      });

      await expect(service.oauthLink(linkDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
