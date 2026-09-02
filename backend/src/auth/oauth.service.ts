import {
  ConflictException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
// jose is pinned to the 4.x line deliberately: 5.x onward is ESM-only, and
// ts-jest in this repo cannot load an ESM-only package — importing it here
// would break every spec that touches auth, not just this file. The
// createRemoteJWKSet/jwtVerify API used below is unchanged across those
// versions, so there is nothing to gain from the upgrade.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthProvider } from '@prisma/client';

/** Raised when a social email collides with an existing password account that
 * cannot be auto-linked (the 4.2 fallback). The client shows a password prompt
 * and completes via POST /auth/oauth/link. */
export class EmailLinkRequiredException extends ConflictException {
  constructor() {
    super({
      statusCode: HttpStatus.CONFLICT,
      code: 'EMAIL_LINK_REQUIRED',
      message:
        'An account with this email already exists. Sign in with your password to link it.',
    });
  }
}

/** Server-verified claims extracted from a provider identity token. Only what
 * the *verified* token asserts is trusted — never client-supplied fields. */
export interface SocialLoginClaims {
  provider: AuthProvider;
  providerAccountId: string; // the provider's `sub`
  email: string | null;
  emailVerified: boolean;
  givenName?: string | null;
  familyName?: string | null;
}

const GOOGLE_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
]);
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

@Injectable()
export class OAuthService {
  private readonly googleClientIds: string[];
  private readonly appleClientIds: string[];
  private readonly appleJwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

  constructor(config: ConfigService) {
    this.googleClientIds = (config.get<string>('GOOGLE_OAUTH_CLIENT_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const servicesId = config.get<string>('APPLE_SERVICES_ID')?.trim();
    const bundleId = config.get<string>('APPLE_BUNDLE_ID')?.trim();
    this.appleClientIds = [servicesId, bundleId].filter(
      (s): s is string => Boolean(s),
    );
  }

  get googleConfigured(): boolean {
    return this.googleClientIds.length > 0;
  }

  get appleConfigured(): boolean {
    return this.appleClientIds.length > 0;
  }

  async verifyGoogleIdToken(
    idToken: string,
    nonce?: string,
  ): Promise<SocialLoginClaims> {
    if (!this.googleConfigured) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured yet.',
      );
    }
    const client = new OAuth2Client();
    let payload: {
      sub?: string;
      iss?: string;
      exp?: number;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      nonce?: string;
    };
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: this.googleClientIds,
      });
      payload = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException('Invalid Google identity token.');
    }
    if (!payload.sub || !GOOGLE_ISSUERS.has(payload.iss ?? '')) {
      throw new UnauthorizedException('Invalid Google identity token.');
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new UnauthorizedException('Google identity token expired.');
    }
    // google-auth-library does not validate nonces; a token carrying one must
    // match the nonce the client generated for this login attempt.
    if (nonce && payload.nonce && payload.nonce !== nonce) {
      throw new UnauthorizedException('Google identity token nonce mismatch.');
    }
    return {
      provider: AuthProvider.GOOGLE,
      providerAccountId: payload.sub,
      email: payload.email ?? null,
      emailVerified: payload.email_verified === true,
      givenName: payload.given_name ?? null,
      familyName: payload.family_name ?? null,
    };
  }

  async verifyAppleIdentityToken(
    identityToken: string,
    nonce?: string,
    name?: { firstName?: string; lastName?: string } | null,
  ): Promise<SocialLoginClaims> {
    if (!this.appleConfigured) {
      throw new ServiceUnavailableException(
        'Apple sign-in is not configured yet.',
      );
    }
    let payload: {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      is_private_email?: boolean;
      nonce?: string;
    };
    try {
      const { payload: p } = await jwtVerify(identityToken, this.appleJwks, {
        issuer: APPLE_ISSUER,
        audience: this.appleClientIds,
      });
      payload = p;
    } catch {
      throw new UnauthorizedException('Invalid Apple identity token.');
    }
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid Apple identity token.');
    }
    if (nonce && payload.nonce && payload.nonce !== nonce) {
      throw new UnauthorizedException('Apple identity token nonce mismatch.');
    }
    return {
      provider: AuthProvider.APPLE,
      providerAccountId: payload.sub,
      email: payload.email ?? null,
      emailVerified: payload.email_verified === true,
      // Apple sends the name in the sign-in *response*, not the token, and
      // only on the very first authorization — the caller passes it through.
      givenName: name?.firstName ?? null,
      familyName: name?.lastName ?? null,
    };
  }
}