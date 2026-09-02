import { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { OAuthService } from './oauth.service';

// The `mock` prefix is required: jest hoists these factories above the
// imports, and only out-of-scope names beginning with `mock` are allowed
// inside them.
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  })),
}));

const mockJwtVerify = jest.fn();
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'jwks'),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

function makeService(env: Record<string, string>): OAuthService {
  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
  return new OAuthService(config);
}

const CONFIGURED = {
  GOOGLE_OAUTH_CLIENT_IDS: 'android-client.apps.googleusercontent.com, web-client.apps.googleusercontent.com',
  APPLE_SERVICES_ID: 'com.drift.tennis.service',
  APPLE_BUNDLE_ID: 'com.drift.tennis',
};

describe('OAuthService', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    mockJwtVerify.mockReset();
  });

  describe('configuration', () => {
    it('refuses rather than trusting anything when no client IDs are set', async () => {
      const service = makeService({});

      await expect(service.verifyGoogleIdToken('tok')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.verifyAppleIdentityToken('tok')).rejects.toThrow(
        ServiceUnavailableException,
      );
      // The point: an unconfigured deployment must never reach the verifier.
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('splits and trims the comma-separated Google client IDs', () => {
      const service = makeService(CONFIGURED);
      expect(service.googleConfigured).toBe(true);
      expect(service.appleConfigured).toBe(true);
    });
  });

  describe('verifyGoogleIdToken', () => {
    const payload = {
      sub: 'google-sub-1',
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 600,
      email: 'ada@test.com',
      email_verified: true,
      given_name: 'Ada',
      family_name: 'Lovelace',
    };

    it('returns claims from the verified token only', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload });
      const service = makeService(CONFIGURED);

      const claims = await service.verifyGoogleIdToken('tok');

      expect(claims).toEqual({
        provider: 'GOOGLE',
        providerAccountId: 'google-sub-1',
        email: 'ada@test.com',
        emailVerified: true,
        givenName: 'Ada',
        familyName: 'Lovelace',
      });
      // The audience list is what stops a token minted for someone else's
      // Google client from signing in here.
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'tok',
        audience: [
          'android-client.apps.googleusercontent.com',
          'web-client.apps.googleusercontent.com',
        ],
      });
    });

    it('rejects a token the library refuses (bad signature or audience)', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
      const service = makeService(CONFIGURED);

      await expect(service.verifyGoogleIdToken('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a foreign issuer', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...payload, iss: 'https://evil.example.com' }),
      });
      const service = makeService(CONFIGURED);

      await expect(service.verifyGoogleIdToken('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          ...payload,
          exp: Math.floor(Date.now() / 1000) - 60,
        }),
      });
      const service = makeService(CONFIGURED);

      await expect(service.verifyGoogleIdToken('tok')).rejects.toThrow(
        'Google identity token expired.',
      );
    });

    it('rejects a nonce that does not match this login attempt', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...payload, nonce: 'minted-for-another-attempt' }),
      });
      const service = makeService(CONFIGURED);

      await expect(
        service.verifyGoogleIdToken('tok', 'this-attempt'),
      ).rejects.toThrow('Google identity token nonce mismatch.');
    });

    it('reports an unverified provider email as unverified', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...payload, email_verified: false }),
      });
      const service = makeService(CONFIGURED);

      // This flag is the whole input to the 4.2 auto-link decision, so a
      // missing or false value must never read as verified.
      const claims = await service.verifyGoogleIdToken('tok');
      expect(claims.emailVerified).toBe(false);
    });
  });

  describe('verifyAppleIdentityToken', () => {
    it('checks issuer and audience, and takes the name from the response', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'apple-sub-1', email: 'ada@privaterelay.appleid.com' },
      });
      const service = makeService(CONFIGURED);

      const claims = await service.verifyAppleIdentityToken('tok', undefined, {
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(claims.provider).toBe('APPLE');
      expect(claims.providerAccountId).toBe('apple-sub-1');
      // Apple puts the name in the sign-in response, not the token, and only
      // on the first authorization — it has to come through the argument.
      expect(claims.givenName).toBe('Ada');
      expect(mockJwtVerify).toHaveBeenCalledWith('tok', 'jwks', {
        issuer: 'https://appleid.apple.com',
        audience: ['com.drift.tennis.service', 'com.drift.tennis'],
      });
    });

    it('rejects a token jose refuses', async () => {
      mockJwtVerify.mockRejectedValue(new Error('signature verification failed'));
      const service = makeService(CONFIGURED);

      await expect(service.verifyAppleIdentityToken('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a nonce mismatch', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'apple-sub-1', nonce: 'other' },
      });
      const service = makeService(CONFIGURED);

      await expect(
        service.verifyAppleIdentityToken('tok', 'this-attempt'),
      ).rejects.toThrow('Apple identity token nonce mismatch.');
    });

    it('accepts the token when the claim is SHA-256 of the raw nonce', async () => {
      // Apple is handed sha256(raw) and embeds it verbatim; the client sends
      // us the raw value, so holding the token alone is not enough to pass.
      const raw = 'this-attempt';
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'apple-sub-1',
          nonce: createHash('sha256').update(raw).digest('hex'),
        },
      });
      const service = makeService(CONFIGURED);

      const claims = await service.verifyAppleIdentityToken('tok', raw);
      expect(claims.providerAccountId).toBe('apple-sub-1');
    });

    it('rejects the raw nonce echoed back unhashed', async () => {
      const raw = 'this-attempt';
      mockJwtVerify.mockResolvedValue({
        payload: { sub: 'apple-sub-1', nonce: raw },
      });
      const service = makeService(CONFIGURED);

      await expect(
        service.verifyAppleIdentityToken('tok', raw),
      ).rejects.toThrow('Apple identity token nonce mismatch.');
    });
  });
});
