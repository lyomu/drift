import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Process-local operational telemetry for the Platform Admin health screen.
 * It deliberately reports only what this API instance has actually observed;
 * an external APM can replace it later without changing the dashboard shape.
 */
@Injectable()
export class PlatformTelemetryService implements NestInterceptor {
  private readonly startedAt = new Date();
  private requestCount = 0;
  private errorCount = 0;
  private latencyTotalMs = 0;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const started = performance.now();
    return next.handle().pipe(
      tap({
        next: () => this.record(performance.now() - started, false),
        error: () => this.record(performance.now() - started, true),
      }),
    );
  }

  snapshot() {
    return {
      startedAt: this.startedAt.toISOString(),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate:
        this.requestCount === 0
          ? 0
          : Number(((this.errorCount / this.requestCount) * 100).toFixed(2)),
      averageLatencyMs:
        this.requestCount === 0
          ? 0
          : Math.round(this.latencyTotalMs / this.requestCount),
    };
  }

  private record(latencyMs: number, failed: boolean) {
    this.requestCount += 1;
    this.latencyTotalMs += latencyMs;
    if (failed) this.errorCount += 1;
  }
}
