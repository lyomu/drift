import { Histogram, collectDefaultMetrics, register } from 'prom-client';

// Node process metrics (CPU, memory, event loop lag, GC, active handles).
// prom-client registers these by name against the shared default registry
// and throws if asked twice, so this module — imported by both the
// interceptor and the controller — is the single place that calls it.
collectDefaultMetrics();

// Labelled by method, matched route *pattern*, and status code only. Never
// the raw URL: a dynamic segment like /users/:id turning into a label value
// per distinct id would make the series count grow without bound as real
// traffic accumulates. `metrics.interceptor.ts` is what enforces that by
// reading Express's post-routing `req.route.path` rather than `req.path`.
export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds, labelled by method, route and status_code.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export { register };
