import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type SwingSession } from '@prisma/client';
import type { LocaleCode } from '../common/i18n';
import { PrismaService } from '../prisma/prisma.service';
import {
  COACH_FEEDBACK_PROVIDERS,
  CoachFeedbackError,
  type CoachFeedbackProvider,
  type CoachFeedbackRequest,
  type CoachFeedbackResult,
  type CoachTip,
  SWING_METRIC_KEYS,
} from './coach-feedback.provider';
import type { CreateSwingSessionDto } from './dto/swing-session.dto';

/** Serialized size ceiling for metrics + summary. A 2-minute session is ~5 KB. */
const MAX_PAYLOAD_BYTES = 64 * 1024;
/** Matches the app's own floor: below this, no summary and no coaching. */
export const MIN_MEASURED_FOR_FEEDBACK = 3;
const MAX_TIP_CHARS = 400;
const REFUSAL_REASONS = ['arm_hidden', 'out_of_frame', 'too_fast'] as const;
/** The app analyses at most 60 s of a clip; allow headroom, refuse nonsense. */
const MAX_CLIP_ANALYSED_MS = 10 * 60 * 1000;

type SummaryEntry = { mean: number; spread: number; count: number };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

@Injectable()
export class SwingSessionsService {
  private readonly logger = new Logger(SwingSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(COACH_FEEDBACK_PROVIDERS)
    private readonly providers: CoachFeedbackProvider[],
  ) {}

  async create(userId: string, dto: CreateSwingSessionDto): Promise<SwingSession> {
    if (dto.swingsMeasured > dto.swingsDetected) {
      throw new BadRequestException('swingsMeasured cannot exceed swingsDetected.');
    }
    const source = dto.source ?? 'LIVE';
    this.assertMetricsShape(dto.metrics);
    this.assertClipShape(dto.metrics, source);
    this.assertSummaryShape(dto.summary);
    const size = Buffer.byteLength(JSON.stringify([dto.metrics, dto.summary]));
    if (size > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException('Session data is too large.');
    }

    return this.prisma.swingSession.create({
      data: {
        userId,
        stroke: dto.stroke,
        dominantHand: dto.dominantHand,
        swingsDetected: dto.swingsDetected,
        swingsMeasured: dto.swingsMeasured,
        metrics: dto.metrics as Prisma.InputJsonValue,
        summary: dto.summary as Prisma.InputJsonValue,
        poseModel: dto.poseModel,
        appVersion: dto.appVersion,
        source,
      },
    });
  }

  listForUser(userId: string, take = 20) {
    return this.prisma.swingSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, Math.floor(take) || 20), 50),
      // History rows need the headline numbers, not every swing.
      select: {
        id: true,
        stroke: true,
        dominantHand: true,
        swingsDetected: true,
        swingsMeasured: true,
        summary: true,
        source: true,
        createdAt: true,
      },
    });
  }

  async findForUser(userId: string, id: string): Promise<SwingSession> {
    const session = await this.prisma.swingSession.findFirst({
      where: { id, userId },
    });
    if (!session) throw new NotFoundException('Swing session not found.');
    return session;
  }

  /**
   * Generate (or return the stored) coach feedback for a session, in `locale`.
   * Feedback is stored per session; asking again in another language
   * regenerates it in that language.
   */
  async feedback(userId: string, id: string, locale: LocaleCode): Promise<SwingSession> {
    const session = await this.findForUser(userId, id);
    const stored = session.feedback as { locale?: string } | null;
    if (stored && stored.locale === locale) return session;

    if (session.swingsMeasured < MIN_MEASURED_FOR_FEEDBACK) {
      throw new UnprocessableEntityException({
        code: 'TOO_FEW_SWINGS',
        message: `At least ${MIN_MEASURED_FOR_FEEDBACK} measured swings are needed for feedback.`,
      });
    }

    const provider = this.pickProvider();
    if (!provider) {
      throw new ServiceUnavailableException({
        code: 'COACH_UNAVAILABLE',
        message: 'Coach feedback is not configured on this server.',
      });
    }

    let result: CoachFeedbackResult;
    try {
      const raw = await provider.generate(this.buildRequest(session, locale));
      result = this.validateResult(raw);
    } catch (error) {
      const code = error instanceof CoachFeedbackError ? error.code : 'UNKNOWN';
      this.logger.warn(`Coach feedback failed (${provider.name}): ${code}`);
      if (code === 'AUTHENTICATION') {
        throw new ServiceUnavailableException({
          code: 'COACH_UNAVAILABLE',
          message: 'Coach feedback is not configured on this server.',
        });
      }
      throw new BadGatewayException({
        code: 'COACH_FAILED',
        message: 'Coach feedback could not be generated. Try again later.',
      });
    }

    return this.prisma.swingSession.update({
      where: { id: session.id },
      data: {
        feedback: {
          locale,
          overall: result.overall,
          tips: result.tips,
          provider: provider.name,
          model: provider.model,
          generatedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * `COACH_AI_PROVIDER`: `anthropic`, `openai`, `disabled`, or `auto` (default):
   * whichever has a key, Claude first.
   */
  private pickProvider(): CoachFeedbackProvider | undefined {
    const choice = (process.env.COACH_AI_PROVIDER ?? 'auto').trim().toLowerCase();
    if (choice === 'disabled') return undefined;
    const configured = this.providers.filter((p) => p.configured);
    if (choice === 'anthropic' || choice === 'openai') {
      return configured.find((p) => p.name === choice);
    }
    return (
      configured.find((p) => p.name === 'anthropic') ??
      configured.find((p) => p.name === 'openai')
    );
  }

  private buildRequest(session: SwingSession, locale: LocaleCode): CoachFeedbackRequest {
    const summary: CoachFeedbackRequest['summary'] = {};
    const rawSummary = (session.summary ?? {}) as Record<string, unknown>;
    for (const key of SWING_METRIC_KEYS) {
      const entry = rawSummary[key] as Partial<SummaryEntry> | undefined;
      if (
        entry &&
        isFiniteNumber(entry.mean) &&
        isFiniteNumber(entry.spread) &&
        isFiniteNumber(entry.count)
      ) {
        summary[key] = {
          mean: Math.round(entry.mean * 10) / 10,
          spread: Math.round(entry.spread * 10) / 10,
          count: entry.count,
        };
      }
    }

    const refusals: Record<string, number> = {};
    const swings = ((session.metrics as { swings?: unknown[] })?.swings ?? []) as {
      measured?: boolean;
      reason?: string;
    }[];
    for (const swing of swings) {
      if (swing.measured === false && swing.reason) {
        refusals[swing.reason] = (refusals[swing.reason] ?? 0) + 1;
      }
    }

    return {
      locale,
      stroke: session.stroke,
      dominantHand: session.dominantHand,
      swingsDetected: session.swingsDetected,
      swingsMeasured: session.swingsMeasured,
      summary,
      refusals,
    };
  }

  /** The model's JSON is untrusted: check every field before storing it. */
  private validateResult(raw: unknown): CoachFeedbackResult {
    const invalid = () => new CoachFeedbackError('INVALID_RESPONSE', false);
    if (!raw || typeof raw !== 'object') throw invalid();
    const { overall, tips } = raw as { overall?: unknown; tips?: unknown };
    if (typeof overall !== 'string' || !overall.trim()) throw invalid();
    if (!Array.isArray(tips) || tips.length === 0) throw invalid();

    const allowed = new Set<string>([...SWING_METRIC_KEYS, 'general']);
    const clean: CoachTip[] = [];
    for (const tip of tips.slice(0, 4)) {
      const { metric, text } = (tip ?? {}) as { metric?: unknown; text?: unknown };
      if (typeof metric !== 'string' || !allowed.has(metric)) continue;
      if (typeof text !== 'string' || !text.trim()) continue;
      clean.push({
        metric: metric as CoachTip['metric'],
        text: text.trim().slice(0, MAX_TIP_CHARS),
      });
    }
    if (clean.length === 0) throw invalid();
    return { overall: overall.trim().slice(0, MAX_TIP_CHARS), tips: clean };
  }

  private assertMetricsShape(metrics: Record<string, unknown>) {
    const swings = metrics.swings;
    if (!Array.isArray(swings) || swings.length > 200) {
      throw new BadRequestException('metrics.swings must be an array of at most 200 swings.');
    }
    for (const swing of swings) {
      if (!swing || typeof swing !== 'object') {
        throw new BadRequestException('Each swing must be an object.');
      }
      const { measured, reason, values } = swing as {
        measured?: unknown;
        reason?: unknown;
        values?: unknown;
      };
      if (typeof measured !== 'boolean') {
        throw new BadRequestException('Each swing needs a boolean "measured".');
      }
      if (
        !measured &&
        (typeof reason !== 'string' ||
          !(REFUSAL_REASONS as readonly string[]).includes(reason))
      ) {
        throw new BadRequestException('An unmeasured swing needs a known reason.');
      }
      if (values !== undefined) {
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
          throw new BadRequestException('Swing values must be an object.');
        }
        for (const [key, value] of Object.entries(values)) {
          if (!(SWING_METRIC_KEYS as readonly string[]).includes(key) || !isFiniteNumber(value)) {
            throw new BadRequestException(`Unknown or non-numeric metric "${key}".`);
          }
        }
      }
    }
  }

  /** `metrics.clip` ({analysedMs, truncated}) belongs to CLIP sessions only. */
  private assertClipShape(metrics: Record<string, unknown>, source: string) {
    const clip = metrics.clip;
    if (clip === undefined) return;
    if (source !== 'CLIP') {
      throw new BadRequestException('metrics.clip is only allowed on CLIP sessions.');
    }
    const { analysedMs, truncated } = (clip ?? {}) as {
      analysedMs?: unknown;
      truncated?: unknown;
    };
    if (
      !clip ||
      typeof clip !== 'object' ||
      Array.isArray(clip) ||
      !isFiniteNumber(analysedMs) ||
      analysedMs < 0 ||
      analysedMs > MAX_CLIP_ANALYSED_MS ||
      typeof truncated !== 'boolean'
    ) {
      throw new BadRequestException(
        'metrics.clip needs a numeric analysedMs (0 to 600000) and a boolean truncated.',
      );
    }
  }

  private assertSummaryShape(summary: Record<string, unknown>) {
    for (const [key, entry] of Object.entries(summary)) {
      if (!(SWING_METRIC_KEYS as readonly string[]).includes(key)) {
        throw new BadRequestException(`Unknown summary metric "${key}".`);
      }
      const { mean, spread, count } = (entry ?? {}) as Partial<SummaryEntry>;
      if (!isFiniteNumber(mean) || !isFiniteNumber(spread) || !isFiniteNumber(count)) {
        throw new BadRequestException(`Summary metric "${key}" must have numeric mean, spread and count.`);
      }
    }
  }
}
