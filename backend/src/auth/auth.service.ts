import { createHash, randomBytes, randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  AccountStatus,
  AuthProvider,
  OnboardingStep,
  VerificationChannel,
  VerificationPurpose,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mail/mailer.service';
import {
  EmailLinkRequiredException,
  OAuthService,
  SocialLoginClaims,
} from './oauth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthGoogleDto, OAuthAppleDto, OAuthLinkDto } from './dto/oauth.dto';
import { parseDurationMs } from './util/duration.util';
import { PasswordPolicyService } from './password-policy';

const BCRYPT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly isDev: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    private readonly oauth: OAuthService,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {
    this.isDev = this.config.get<string>('NODE_ENV') !== 'production';
  }

  async signUp(dto: SignUpDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        'Unable to create account with these details.',
      );
    }

    await this.passwordPolicy.assertAcceptable(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          onboardingStep: OnboardingStep.VERIFY,
          tennisProfile: { create: {} },
        },
      });

      await tx.verificationCode.create({
        data: {
          userId: created.id,
          channel: VerificationChannel.EMAIL,
          purpose: VerificationPurpose.SIGNUP,
          codeHash,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });

      return created;
    });

    this.logCode(user.email!, code);
    // No-op when SMTP is not configured (dev + pre-wire production); a send
    // failure never fails signup — the user can hit resend on the verify screen.
    await this.mailer.sendVerificationCode(user.email!, code, 'signup');

    return { userId: user.id, ...this.devCode(code) };
  }

  async verify(dto: VerifyDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired code.');
    }

    const record = await this.prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        purpose: VerificationPurpose.SIGNUP,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code.');
    }
    if (record.attemptCount >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    const matches = await bcrypt.compare(dto.code, record.codeHash);
    if (!matches) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException('Invalid or expired code.');
    }

    await this.prisma.$transaction([
      this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          verificationStatus: VerificationStatus.VERIFIED,
          onboardingStep: OnboardingStep.BASIC_PROFILE,
        },
      }),
    ]);

    return this.issueTokens(user.id);
  }

  async resendCode(dto: ResendCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new BadRequestException('Unable to resend code.');
    }

    const record = await this.prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        purpose: VerificationPurpose.SIGNUP,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      record &&
      Date.now() - record.lastSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Please wait before requesting another code.',
      );
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    if (record) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: {
          codeHash,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
          attemptCount: 0,
          resendCount: { increment: 1 },
          lastSentAt: new Date(),
        },
      });
    } else {
      await this.prisma.verificationCode.create({
        data: {
          userId: user.id,
          channel: VerificationChannel.EMAIL,
          purpose: VerificationPurpose.SIGNUP,
          codeHash,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });
    }

    this.logCode(user.email!, code);
    await this.mailer.sendVerificationCode(user.email!, code, 'signup');
    return this.devCode(code);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      // A social-only account has no passwordHash — same generic message so a
      // probe can't distinguish "no account" from "social-only account" here.
      throw new UnauthorizedException('Invalid credentials.');
    }
    // Same message as a bad password — don't reveal a deleted account's
    // existence to whoever is trying to log into it.
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    // Suspended is stated plainly: unlike deletion, suspension is meant to
    // be understood and appealed, and the holder of valid credentials
    // already knows the account exists.
    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'This account has been suspended. Contact support.',
      );
    }

    return this.issueTokens(user.id);
  }

  // ---------------------------------------------------------------- oauth

  /** Google sign-in: verify the id-token server-side, then sign in / create /
   * link the account. Never trusts a client-supplied email or id. */
  async oauthGoogle(dto: OAuthGoogleDto): Promise<AuthTokens> {
    const claims = await this.oauth.verifyGoogleIdToken(dto.idToken, dto.nonce);
    return this.socialSignIn(claims);
  }

  async oauthApple(dto: OAuthAppleDto): Promise<AuthTokens> {
    const claims = await this.oauth.verifyAppleIdentityToken(
      dto.identityToken,
      dto.nonce,
      dto.name,
    );
    return this.socialSignIn(claims);
  }

  /** 4.2 fallback: the email already has a password account that can't be
   * auto-linked, so the user proved the password — attach the identity to it. */
  async oauthLink(dto: OAuthLinkDto): Promise<AuthTokens> {
    const claims =
      dto.provider === AuthProvider.GOOGLE
        ? await this.oauth.verifyGoogleIdToken(dto.idToken, dto.nonce)
        : await this.oauth.verifyAppleIdentityToken(
            dto.idToken,
            dto.nonce,
            dto.name,
          );
    const email = dto.email.trim().toLowerCase();
    return this.linkSocialIdentity(claims, email, dto.password);
  }

  private displayName(claims: SocialLoginClaims): string | null {
    const parts = [claims.givenName, claims.familyName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * A social sign-in must not become a back door into an account the password
   * path would refuse, so both states are rejected the same way login does.
   */
  private assertUsable(accountStatus: AccountStatus) {
    if (accountStatus === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'This account has been suspended. Contact support.',
      );
    }
    if (accountStatus === AccountStatus.DELETED) {
      throw new UnauthorizedException('Invalid credentials.');
    }
  }

  /**
   * The heart of Phase 4. Three cases, in order:
   *
   * 1. The identity is already known → straight in. This is every returning
   *    social user, and it is matched on the provider's `sub`, never on email,
   *    so a person changing their Google address keeps the same account.
   * 2. No identity and no account for the email → create both. The provider
   *    already verified the address, so these users skip the email-verification
   *    screen and land on BASIC_PROFILE with a tennis profile, exactly where
   *    a verified password signup lands.
   * 3. No identity but the email already has an account → the 4.2 policy:
   *    auto-link only when *both* sides are verified, otherwise 409 and let
   *    the client prove the password via oauthLink().
   */
  private async socialSignIn(claims: SocialLoginClaims): Promise<AuthTokens> {
    const existingIdentity = await this.prisma.socialIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: claims.provider,
          providerAccountId: claims.providerAccountId,
        },
      },
      include: { user: { select: { id: true, accountStatus: true } } },
    });
    if (existingIdentity) {
      this.assertUsable(existingIdentity.user.accountStatus);
      return this.issueTokens(existingIdentity.user.id);
    }

    const email = claims.email?.trim().toLowerCase() ?? null;

    // Nested rather than a ternary so the non-null `email` narrowing carries
    // into the branch — the 409 has to name the address it matched.
    if (email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        this.assertUsable(existingUser.accountStatus);
        // 4.2: auto-link is safe only when the provider asserts the address
        // AND this account proved the same address itself. Either half
        // missing and an attacker holding an unverified address at the
        // provider could walk into someone else's account, so fall back to
        // proving the password.
        if (!claims.emailVerified || !existingUser.emailVerifiedAt) {
          throw new EmailLinkRequiredException(email);
        }
        await this.prisma.socialIdentity.create({
          data: {
            provider: claims.provider,
            providerAccountId: claims.providerAccountId,
            userId: existingUser.id,
            email,
            name: this.displayName(claims),
          },
        });
        return this.issueTokens(existingUser.id);
      }
    }

    // Apple's private relay can withhold the address entirely; email is
    // nullable on User, so such an account is created without one and picks
    // it up during onboarding rather than being refused at the door.
    const verifiedNow = claims.emailVerified ? new Date() : null;
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash: null,
          firstName: claims.givenName ?? null,
          lastName: claims.familyName ?? null,
          emailVerifiedAt: verifiedNow,
          verificationStatus: verifiedNow
            ? VerificationStatus.VERIFIED
            : VerificationStatus.UNVERIFIED,
          onboardingStep: OnboardingStep.BASIC_PROFILE,
          tennisProfile: { create: {} },
        },
      });

      await tx.socialIdentity.create({
        data: {
          provider: claims.provider,
          providerAccountId: claims.providerAccountId,
          userId: created.id,
          email,
          // Apple sends the name once and never again — this write is the
          // only chance to keep it.
          name: this.displayName(claims),
        },
      });

      return created;
    });

    return this.issueTokens(user.id);
  }

  /**
   * The 4.2 fallback completed: the caller could not be auto-linked, so they
   * supplied the existing account's password. Verifying it here is what makes
   * the link safe — the identity token alone was never enough.
   */
  private async linkSocialIdentity(
    claims: SocialLoginClaims,
    email: string,
    password: string,
  ): Promise<AuthTokens> {
    // The token's address must be the one being linked, or a valid token for
    // account A could be attached to account B by anyone holding B's password.
    if (!claims.email || claims.email.trim().toLowerCase() !== email) {
      throw new UnauthorizedException(
        'This sign-in does not match the account being linked.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    this.assertUsable(user.accountStatus);

    const claimed = await this.prisma.socialIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: claims.provider,
          providerAccountId: claims.providerAccountId,
        },
      },
    });
    if (claimed && claimed.userId !== user.id) {
      throw new ConflictException(
        'This sign-in is already linked to another account.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.socialIdentity.upsert({
        where: {
          provider_providerAccountId: {
            provider: claims.provider,
            providerAccountId: claims.providerAccountId,
          },
        },
        create: {
          provider: claims.provider,
          providerAccountId: claims.providerAccountId,
          userId: user.id,
          email,
          name: this.displayName(claims),
        },
        update: {},
      }),
      // Linking a new way into the account is a credential change, so other
      // sessions go — the same rule changePassword follows.
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // The provider asserted this address, so an account that linked through
      // this path is verified from here on.
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          verificationStatus: VerificationStatus.VERIFIED,
        },
      }),
    ]);

    return this.issueTokens(user.id);
  }

  /**
   * Also revokes every existing refresh token, forcing re-login on other
   * devices — the closest this phase gets to "log out other sessions"
   * without a session-tracking table (deferred, see PROGRESS.md).
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    await this.passwordPolicy.assertAcceptable(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return this.issueTokens(userId);
  }

  /**
   * Deliberately non-enumerating: always resolves, whether or not the address
   * belongs to an account. `resendCode()` throws on an unknown email, which
   * leaks account existence — Forgot Password is specified as a "generic,
   * non-enumerating" flow (foundation/04-screen-inventory.md A.1), so it
   * can't reuse that shape.
   *
   * Everything else is the SIGNUP code machinery unchanged — hashing, TTL,
   * attempt cap and resend cooldown all live on the same VerificationCode
   * row; only `purpose` separates the two flows.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Unknown address, or a deleted account — same silent success as the
    // happy path, mirroring login()'s refusal to confirm a deleted account
    // exists.
    if (!user || user.accountStatus === AccountStatus.DELETED) {
      return {};
    }

    const record = await this.prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        purpose: VerificationPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Inside the cooldown we skip re-issuing rather than throwing. A
    // "please wait" error would only ever be observable for a real account,
    // which would re-open the enumeration hole this method exists to close.
    if (
      record &&
      Date.now() - record.lastSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return {};
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    if (record) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: {
          codeHash,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
          attemptCount: 0,
          resendCount: { increment: 1 },
          lastSentAt: new Date(),
        },
      });
    } else {
      await this.prisma.verificationCode.create({
        data: {
          userId: user.id,
          channel: VerificationChannel.EMAIL,
          purpose: VerificationPurpose.PASSWORD_RESET,
          codeHash,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });
    }

    this.logCode(user.email!, code);
    await this.mailer.sendVerificationCode(user.email!, code, 'password-reset');
    return this.devCode(code);
  }

  /**
   * Consumes a PASSWORD_RESET code and writes the new password. Every live
   * refresh token is revoked in the same transaction — the same blast radius
   * as changePassword(), and the reason no tokens are issued back: Doc 4
   * §A.1 lists Login as the screen Forgot Password connects to, so the
   * caller re-authenticates with the password they just set.
   *
   * Deliberately leaves emailVerifiedAt/verificationStatus/onboardingStep
   * alone. A reset proves control of the address, but promoting verification
   * through this path would desync the onboarding step machine.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired code.');
    }

    const record = await this.prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        // Scoped to this purpose so a pending signup code can never be
        // spent on a password reset.
        purpose: VerificationPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code.');
    }
    if (record.attemptCount >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    const matches = await bcrypt.compare(dto.code, record.codeHash);
    if (!matches) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException('Invalid or expired code.');
    }

    await this.passwordPolicy.assertAcceptable(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { accountStatus: true } } },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    // A suspension must cut off the refresh path too, or a suspended user
    // simply rides out the access-token TTL.
    if (
      record.user.accountStatus === AccountStatus.SUSPENDED ||
      record.user.accountStatus === AccountStatus.DELETED
    ) {
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token.');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(record.userId);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId });

    const refreshToken = randomBytes(32).toString('hex');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '30d';
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationMs(refreshTtl)),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateCode(): string {
    return randomInt(100000, 1_000_000).toString();
  }

  private logCode(email: string, code: string) {
    if (this.isDev) {
      console.log(`[auth] Verification code for ${email}: ${code}`);
    }
  }

  private devCode(code: string) {
    return this.isDev ? { devVerificationCode: code } : {};
  }
}
