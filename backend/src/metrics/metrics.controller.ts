import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { register } from './metrics.registry';

/**
 * Prometheus scrape endpoint. No auth, same posture as `GET /health`
 * (`app.controller.ts`): both exist for infrastructure to poll, not end
 * users, and Prometheus's scrape config has no built-in way to carry a
 * bearer token without extra setup on the server side anyway.
 *
 * `@SkipThrottle()` exempts it from the global `ThrottlerGuard`
 * (`app.module.ts`) — scrape traffic is frequent, machine-cadence polling
 * that the login/API rate limits were never meant to police.
 */
@Controller()
@SkipThrottle()
export class MetricsController {
  @Get('metrics')
  async getMetrics(@Res({ passthrough: true }) res: Response): Promise<string> {
    res.set('Content-Type', register.contentType);
    return register.metrics();
  }
}
