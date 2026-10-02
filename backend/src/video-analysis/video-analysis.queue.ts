/**
 * The analysis queue.
 *
 * Analysis is minutes of GPU work, so it cannot happen in the request the way the
 * precheck does. The queue is where durability lives: retries, backoff and the record
 * that work is outstanding at all. cv-service stays a plain request/response service
 * and owns none of that — one place for those concerns rather than two.
 */
export const VIDEO_ANALYSIS_QUEUE = 'video-analysis';

export interface AnalyzeJobData {
  jobId: string;
}

/**
 * One at a time, matching the one GPU at the other end.
 *
 * cv-service refuses a concurrent analysis with 503 and a Retry-After, so a higher
 * number here would mostly produce rejected calls and burnt retry attempts rather
 * than throughput.
 */
export const ANALYSIS_CONCURRENCY = 1;

export const ANALYSIS_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  // Kept briefly so a failure can be inspected, rather than forever: the job row in
  // Postgres is the durable record, and Redis is not where history belongs.
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 24 * 3600 },
};
