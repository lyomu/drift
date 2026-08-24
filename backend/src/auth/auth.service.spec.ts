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

type MockPrisma = {
  user: Record<string, jest.Mock>;
  verificationCode: Record<string, jest.Mock>;
  refreshToken: Record<string, jest.Mock>;
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

    service = new AuthService(prisma as unknown as PrismaService, jwt, config);
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
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'a@test.com' }),
        }),
      );
      expect(prisma.verificationCode.create).toHaveBeenCalled();
      expect(result.userId).toBe('user-1');
      expect(result.devVerificationCode).toMatch(/^\d{6}$/);
    });

    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.signUp({ email: 'a@test.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
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
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('some-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
      expect(result.accessToken).toBe('access-token');
    });

    it('rejects a revoked refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
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
});
