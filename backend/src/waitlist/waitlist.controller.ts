import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateWaitlistSignupDto } from './dto/create-waitlist-signup.dto';
import { WaitlistService } from './waitlist.service';

/**
 * Public and unauthenticated by design — this is the marketing site's signup
 * form. There is no global JWT guard to opt out of: `AppModule` registers
 * only `ThrottlerGuard` as an `APP_GUARD`, so a controller is open unless it
 * declares otherwise.
 *
 * THROTTLE SIZING — this is a backstop, not the real per-user limit.
 * `trust proxy` is not set on the app, so `req.ip` is the address of whatever
 * connects directly: nginx in production, and the website's own server for
 * every form submission proxied through `/api/waitlist`. Every signup
 * therefore shares one bucket. A per-user-looking limit (3/min, as on the
 * auth routes) would become a site-wide cap and start rejecting real people
 * the moment two of them sign up in the same minute — worst at launch, which
 * is exactly when this endpoint matters.
 *
 * So: a limit low enough to blunt a script, high enough not to be reached by
 * genuine traffic. The per-client limit lives in the website's route handler,
 * which is the only layer that can still see the caller's own address.
 */
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  join(@Body() dto: CreateWaitlistSignupDto) {
    return this.waitlist.join(dto);
  }
}
