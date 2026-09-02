import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  OAuthAppleDto,
  OAuthGoogleDto,
  OAuthLinkDto,
} from './dto/oauth.dto';

/**
 * Strict per-route limits for the endpoints an attacker would hammer:
 * credential guessing, code brute-force and code-request spam. The global
 * 300/min guard still applies underneath. Under NODE_ENV=test these relax
 * automatically (see app.module.ts) so e2e suites are never throttled.
 */
const AUTH_SENSITIVE = { ttl: 60_000, limit: 10 };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: AUTH_SENSITIVE })
  @Post('signup')
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: VerifyDto) {
    return this.authService.verify(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  resendCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendCode(dto);
  }

  /**
   * Always 200, even for an address with no account — see
   * AuthService.forgotPassword for why this must not enumerate.
   */
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: AUTH_SENSITIVE })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle({ default: AUTH_SENSITIVE })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Refresh tokens are 256-bit random and stored hashed, so brute force isn't
  // practical — but these were the only two token-bearing auth routes with no
  // per-route limit, and defence in depth shouldn't have gaps just because
  // one layer looks sufficient.
  @Throttle({ default: AUTH_SENSITIVE })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Throttle({ default: AUTH_SENSITIVE })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  /**
   * Social sign-in shares the credential-guessing throttle with login: the
   * id-token is verified against the provider, but the linking path below
   * accepts a password, and all three are worth rate-limiting as one family.
   */
  @Throttle({ default: AUTH_SENSITIVE })
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  oauthGoogle(@Body() dto: OAuthGoogleDto) {
    return this.authService.oauthGoogle(dto);
  }

  @Throttle({ default: AUTH_SENSITIVE })
  @Post('oauth/apple')
  @HttpCode(HttpStatus.OK)
  oauthApple(@Body() dto: OAuthAppleDto) {
    return this.authService.oauthApple(dto);
  }

  /**
   * Completes a 409 EMAIL_LINK_REQUIRED from either route above — the client
   * re-sends the identity token together with the existing account's password.
   */
  @Throttle({ default: AUTH_SENSITIVE })
  @Post('oauth/link')
  @HttpCode(HttpStatus.OK)
  oauthLink(@Body() dto: OAuthLinkDto) {
    return this.authService.oauthLink(dto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.changePassword(userId, dto);
  }
}
