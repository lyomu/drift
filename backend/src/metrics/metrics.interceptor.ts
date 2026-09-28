import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { httpRequestDurationSeconds } from './metrics.registry';

// @types/express leaves `Request.route` untyped (`any`) since Express itself
// only attaches it at runtime once a route matches. This is just enough of
// a shape to read the matched pattern back out safely.
interface RequestWithMatchedRoute extends Request {
  // Not `route?:` — Express's own `Request.route` is a required (if `any`)
  // property, and TypeScript rejects narrowing a required property to
  // optional in a subtype. Allowing `undefined` in the value instead keeps
  // this assignable while still letting the read below be checked safely.
  route: { path?: string } | undefined;
}

/**
 * Records `http_request_duration_seconds` for every HTTP request.
 *
 * `context.getType()` is 'ws' for the messaging gateway's socket.io handlers
 * (`messaging/messaging.gateway.ts`), not 'http' — mirrors the guard already
 * used by `PlatformTelemetryService` (`platform-admin/platform-telemetry.service.ts`)
 * for the same reason: a global interceptor still runs for gateway message
 * handlers, and those have no Express req/res to read.
 *
 * Listens for the response's `finish` event rather than the observable's
 * `next`/`error`, because by the time this interceptor's observable errors,
 * Nest's exception filters haven't run yet — `response.statusCode` would
 * still read its pre-error default (200), not the final code. `finish` fires
 * only after headers are sent, so the status code is always the real one.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithMatchedRoute>();
    const response = httpContext.getResponse<Response>();
    const started = process.hrtime.bigint();

    response.once('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
      // Set once Express has matched a route; by the time a Nest handler
      // (and therefore this interceptor) runs, it always has. Falls back to
      // 'unmatched' so a typo'd or probed path never mints its own series.
      const route = String(request.route?.path ?? 'unmatched');
      httpRequestDurationSeconds.observe(
        {
          method: request.method,
          route,
          status_code: String(response.statusCode),
        },
        durationSeconds,
      );
    });

    return next.handle();
  }
}
