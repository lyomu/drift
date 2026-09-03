import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { createHash } from 'crypto';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordPolicyService,
} from './password-policy';
import { SignUpDto } from './dto/sign-up.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteClubSetupDto } from '../club-onboarding/dto/club-onboarding.dto';
import { ResetPlatformAdminPasswordDto } from '../platform-admin/dto/platform-admin.dto';
import { AcceptPlatformAdminInviteDto } from '../platform-admin/dto/access-control.dto';

type MockFetch = jest.Mock<Promise<Response>, Parameters<typeof fetch>>;

function makeService(env: Record<string, string | undefined> = {}) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
  return new PasswordPolicyService(config);
}

function mockResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function suffixFor(password: string): string {
  return createHash('sha1')
    .update(password)
    .digest('hex')
    .toUpperCase()
    .slice(5);
}

describe('PasswordPolicyService', () => {
  let originalFetch: typeof fetch;
  let fetchMock: MockFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('rejects a breached password by matching the suffix locally', async () => {
    const password = 'correct horse battery staple';
    fetchMock.mockResolvedValue(mockResponse(`${suffixFor(password)}:42`));

    await expect(
      makeService({ NODE_ENV: 'production' }).assertAcceptable(password),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a clean password', async () => {
    fetchMock.mockResolvedValue(
      mockResponse('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1'),
    );

    await expect(
      makeService({ NODE_ENV: 'production' }).assertAcceptable(
        'clean-password-phrase',
      ),
    ).resolves.toBeUndefined();
  });

  it('fails open on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('connection reset'));

    await expect(
      makeService({ NODE_ENV: 'production' }).assertAcceptable(
        'clean-password-phrase',
      ),
    ).resolves.toBeUndefined();
  });

  it('fails open on non-200 responses', async () => {
    fetchMock.mockResolvedValue(mockResponse('', 503));

    await expect(
      makeService({ NODE_ENV: 'production' }).assertAcceptable(
        'clean-password-phrase',
      ),
    ).resolves.toBeUndefined();
  });

  it('fails open on timeout', async () => {
    const signal = AbortSignal.abort(
      new DOMException('Request timed out', 'TimeoutError'),
    );
    jest.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
    fetchMock.mockRejectedValue(
      new DOMException('Request timed out', 'TimeoutError'),
    );

    await expect(
      makeService({ NODE_ENV: 'production' }).assertAcceptable(
        'clean-password-phrase',
      ),
    ).resolves.toBeUndefined();
  });

  it('sends only the 5-character SHA-1 prefix to HIBP', async () => {
    const password = 'prefix-proof-password';
    const sha1 = createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    fetchMock.mockResolvedValue(
      mockResponse('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1'),
    );

    await makeService({ NODE_ENV: 'production' }).assertAcceptable(password);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe(
      `https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`,
    );
    expect(url).not.toContain(sha1.slice(5));
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      'Add-Padding': 'true',
    });
  });

  it('skips the network check in tests and offline dev', async () => {
    await makeService({ NODE_ENV: 'test' }).assertAcceptable(
      'breached-but-fixture-friendly',
    );
    await makeService({
      NODE_ENV: 'development',
      PASSWORD_BREACH_CHECK_DISABLED: 'true',
    }).assertAcceptable('offline-dev-password');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enforces the 72-byte bcrypt boundary', async () => {
    fetchMock.mockResolvedValue(
      mockResponse('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1'),
    );

    await expect(
      makeService({ NODE_ENV: 'production' }).assertAcceptable(
        'a'.repeat(PASSWORD_MAX_LENGTH),
      ),
    ).resolves.toBeUndefined();
    await expect(
      makeService({ NODE_ENV: 'production' }).assertAcceptable(
        'a'.repeat(PASSWORD_MAX_LENGTH + 1),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('password DTO boundaries', () => {
  const cases: Array<{
    name: string;
    make: (password: string) => object;
  }> = [
    {
      name: 'signup',
      make: (password) =>
        Object.assign(new SignUpDto(), {
          email: 'a@test.com',
          password,
          acceptedAgePolicy: true,
        }),
    },
    {
      name: 'change password',
      make: (newPassword) =>
        Object.assign(new ChangePasswordDto(), {
          currentPassword: 'current-password',
          newPassword,
        }),
    },
    {
      name: 'player password reset',
      make: (newPassword) =>
        Object.assign(new ResetPasswordDto(), {
          email: 'a@test.com',
          code: '123456',
          newPassword,
        }),
    },
    {
      name: 'club setup',
      make: (password) =>
        Object.assign(new CompleteClubSetupDto(), { password }),
    },
    {
      name: 'staff password reset',
      make: (newPassword) =>
        Object.assign(new ResetPlatformAdminPasswordDto(), {
          email: 'staff@test.com',
          code: '123456',
          newPassword,
        }),
    },
    {
      name: 'staff invite accept',
      make: (password) =>
        Object.assign(new AcceptPlatformAdminInviteDto(), {
          token: 'invite-token',
          name: 'Staff Member',
          password,
        }),
    },
  ];

  it.each(cases)('accepts the min/max boundary for $name', async ({ make }) => {
    await expect(
      validate(make('a'.repeat(PASSWORD_MIN_LENGTH))),
    ).resolves.toHaveLength(0);
    await expect(
      validate(make('a'.repeat(PASSWORD_MAX_LENGTH))),
    ).resolves.toHaveLength(0);
  });

  it.each(cases)('rejects overlong passwords for $name', async ({ make }) => {
    const errors = await validate(make('a'.repeat(PASSWORD_MAX_LENGTH + 1)));

    expect(errors.some((error) => error.constraints?.maxLength)).toBe(true);
  });
});
