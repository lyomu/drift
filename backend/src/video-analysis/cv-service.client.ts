import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import { basename } from 'node:path';

/**
 * One finding from a precheck — see cv-service/utils/precheck.py.
 *
 * `message` is written to be shown to the person who uploaded the video, so it is
 * passed through rather than rephrased here. Two copies of the same explanation
 * drift, and the one in Python is the one calibrated against real footage.
 */
export interface PrecheckFinding {
  check: string;
  severity: 'pass' | 'warn' | 'reject';
  message: string;
  detail: Record<string, unknown>;
}

export interface PrecheckResult {
  video: string;
  verdict: 'pass' | 'warn' | 'reject';
  metadata: Record<string, unknown>;
  frames_sampled: boolean;
  /**
   * Whether the court was actually judged. A `pass` with this false means every check
   * that ran passed and the court was never looked at — which is not the same thing,
   * and treating it as one would tell a user their clip is fine when it may not be.
   */
  court_checked: boolean;
  findings: PrecheckFinding[];
}

export interface CvServiceHealth {
  status: string;
  court_model_loaded: boolean;
  court_model_path: string | null;
}

export interface AnalysisResult {
  video: string;
  /**
   * The pipeline's own summary, passed through untouched.
   *
   * Not reshaped into columns here. It carries `court_calibrated` and a `warning`
   * when the court fit failed, which is the difference between a measurement and a
   * plausible-looking number, and flattening it is how that distinction gets lost.
   */
  summary: Record<string, unknown>;
  pipeline_version: string;
}

/**
 * One rally inside a session, as cv-service reports it.
 *
 * `status` is why this rally is or is not in the session totals — `analysed`,
 * `skipped_budget`, `skipped_too_short` or `failed`. It is never absent, because "not in the
 * totals" must always carry a reason rather than being an unexplained gap.
 */
export interface SessionSegment {
  index: number;
  status: 'analysed' | 'skipped_budget' | 'skipped_too_short' | 'failed';
  span: Record<string, unknown>;
  summary?: Record<string, unknown>;
  reason?: string;
}

export interface SessionResult {
  video: string;
  /**
   * The session summary, passed through untouched for the same reason as a single clip's.
   *
   * Carries `mode: "session"`, which is how every layer downstream tells a session apart
   * from one rally without a schema change. Also carries `segments_found` alongside
   * `segments_analysed`: a session can hold more rallies than the frame budget covers, and
   * totals over 8 of 20 rallies must not read as totals over all 20.
   */
  summary: Record<string, unknown>;
  pipeline_version: string;
}

/** cv-service is busy with another analysis; the caller should retry later. */
export class CvServiceBusyError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('The analysis service is busy.');
  }
}

/**
 * Talks to cv-service (see cv-service/api.py).
 *
 * The precheck deliberately lives there and not here. Reimplementing even its cheap
 * header checks in TypeScript would put the thresholds in two languages, and they are
 * calibrated values that will move as real footage arrives — cv-service documents the
 * evidence behind each one. Two copies would silently disagree the first time one
 * moved.
 */
@Injectable()
export class CvServiceClient {
  private readonly logger = new Logger(CvServiceClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly analysisTimeoutMs: number;
  private readonly sessionTimeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('CV_SERVICE_URL') ?? 'http://127.0.0.1:8000'
    ).replace(/\/+$/, '');
    // Measured warm: 74ms to reject on the header, ~1.6s to reach the court check.
    // The ceiling is generous against a cold start, where importing cv2 and loading
    // the model costs several seconds, rather than against the check itself.
    this.timeoutMs = Number(
      this.config.get<string>('CV_SERVICE_TIMEOUT_MS') ?? 60_000,
    );
    // A full analysis is minutes. Measured on an RTX 4060, a 60-frame run took 38s
    // end to end over HTTP; a three-minute clip is far longer. This bounds a hung
    // run rather than predicting a healthy one, and cv-service applies its own
    // ceiling independently.
    this.analysisTimeoutMs = Number(
      this.config.get<string>('CV_SERVICE_ANALYSIS_TIMEOUT_MS') ?? 30 * 60_000,
    );
    // A session is many clips plus a pre-pass over the whole video. cv-service's default
    // frame budget alone is roughly 55 minutes of GPU at the measured ~0.63s/frame, so this
    // sits well above the single-clip ceiling. It bounds a hung run; cv-service applies its
    // own TENNIS_VISION_SESSION_TIMEOUT_S independently and neither trusts the other.
    this.sessionTimeoutMs = Number(
      this.config.get<string>('CV_SERVICE_SESSION_TIMEOUT_MS') ?? 4 * 60 * 60_000,
    );
  }

  async health(): Promise<CvServiceHealth> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/health`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `CV service health check returned ${response.status}.`,
      );
    }
    return (await response.json()) as CvServiceHealth;
  }

  /**
   * Ask the CV service to judge a clip.
   *
   * A refused clip is a SUCCESSFUL call that returns a `reject` verdict — not an
   * error. Only a genuine service failure throws. Conflating the two would report a
   * CV outage to the user as a problem with their filming, so the distinction is kept
   * at every layer: here, in cv-service, and in the tests on both sides.
   */
  async precheck(filePath: string): Promise<PrecheckResult> {
    const form = new FormData();
    // Streamed rather than read into a Buffer: these are videos, and buffering one
    // per concurrent upload is how a service falls over.
    // openAsBlob gives a lazy, file-backed Blob: undici reads it as it sends, so the
    // video is never held in memory in full.
    form.append('file', await this.toBlob(filePath), basename(filePath));

    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/precheck`, {
        method: 'POST',
        body: form,
      });
    } catch (error) {
      this.logger.error(
        `CV service precheck failed for ${basename(filePath)}: ${String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Video checking is temporarily unavailable. Please try again shortly.',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `CV service precheck returned ${response.status}: ${body.slice(0, 500)}`,
      );
      throw new ServiceUnavailableException(
        'Video checking is temporarily unavailable. Please try again shortly.',
      );
    }

    return (await response.json()) as PrecheckResult;
  }

  /**
   * Run the full pipeline on a clip. Minutes, not seconds.
   *
   * Called only from the queue worker. The long timeout is the point: cv-service does
   * the work inside the request because the queue already owns retries and
   * persistence, and duplicating those at the other end would put the same concerns
   * in two places.
   *
   * A 503 means it is busy with another clip — one GPU, one analysis — and is
   * distinguished from a failure so the caller can requeue rather than mark the job
   * failed.
   */
  async analyze(
    filePath: string,
    options: { maxFrames?: number; fast?: boolean } = {},
  ): Promise<AnalysisResult> {
    const form = new FormData();
    form.append('file', await this.toBlob(filePath), basename(filePath));
    if (options.maxFrames) form.append('max_frames', String(options.maxFrames));
    if (options.fast) form.append('fast', 'true');

    let response: Response;
    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/analyze`,
        { method: 'POST', body: form },
        this.analysisTimeoutMs,
      );
    } catch (error) {
      this.logger.error(`CV service analyze failed: ${String(error)}`);
      throw new ServiceUnavailableException('The analysis service is unreachable.');
    }

    if (response.status === 503) {
      const retryAfter = Number(response.headers.get('retry-after') ?? 60);
      throw new CvServiceBusyError(Number.isFinite(retryAfter) ? retryAfter : 60);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `CV service analyze returned ${response.status}: ${body.slice(0, 1000)}`,
      );
      throw new Error(`The analysis failed (${response.status}).`);
    }

    return (await response.json()) as AnalysisResult;
  }

  /**
   * Analyse a clip longer than one rally: segment it, run each rally, return the session.
   *
   * Hours, not minutes. The same 503-means-busy contract as `analyze` applies, and matters
   * more here: a session holds the single GPU for far longer, so a caller that mistook a
   * busy service for a failure would mark a perfectly analysable session FAILED.
   *
   * `dryRun` segments only and analyses nothing — seconds instead of hours. It answers "how
   * many rallies are in this video and where" without committing the GPU, which is what an
   * upload flow wants before asking someone to wait an hour.
   */
  async analyzeSession(
    filePath: string,
    options: { frameBudget?: number; dryRun?: boolean } = {},
  ): Promise<SessionResult> {
    const form = new FormData();
    form.append('file', await this.toBlob(filePath), basename(filePath));
    if (options.frameBudget) {
      form.append('frame_budget', String(options.frameBudget));
    }
    if (options.dryRun) form.append('dry_run', 'true');

    let response: Response;
    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/analyze-session`,
        { method: 'POST', body: form },
        // A dry run is a pre-pass over the video and nothing more, so it gets the ordinary
        // analysis ceiling rather than the session one. Giving it four hours would leave a
        // hung pre-pass sitting on the slot for an afternoon.
        options.dryRun ? this.analysisTimeoutMs : this.sessionTimeoutMs,
      );
    } catch (error) {
      this.logger.error(`CV service analyze-session failed: ${String(error)}`);
      throw new ServiceUnavailableException('The analysis service is unreachable.');
    }

    if (response.status === 503) {
      const retryAfter = Number(response.headers.get('retry-after') ?? 300);
      throw new CvServiceBusyError(Number.isFinite(retryAfter) ? retryAfter : 300);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `CV service analyze-session returned ${response.status}: ${body.slice(0, 1000)}`,
      );
      throw new Error(`The session analysis failed (${response.status}).`);
    }

    return (await response.json()) as SessionResult;
  }

  private async toBlob(filePath: string): Promise<Blob> {
    const { openAsBlob } = await import('node:fs');
    if (typeof openAsBlob === 'function') {
      return openAsBlob(filePath);
    }
    // Fallback for runtimes without openAsBlob (added in Node 19). Reads the file,
    // which is why it is the fallback and not the path taken.
    const chunks: Buffer[] = [];
    for await (const chunk of createReadStream(filePath)) {
      chunks.push(chunk as Buffer);
    }
    return new Blob([Buffer.concat(chunks)]);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = this.timeoutMs,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
