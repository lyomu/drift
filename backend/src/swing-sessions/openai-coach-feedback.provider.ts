import { Injectable, Logger } from '@nestjs/common';
import {
  COACH_FEEDBACK_SCHEMA,
  CoachFeedbackError,
  type CoachFeedbackProvider,
  type CoachFeedbackRequest,
  coachInstructions,
} from './coach-feedback.provider';

/**
 * Coach feedback through OpenAI's Responses API, following the same request and
 * error shape as `news/openai-news-ai.provider.ts`, which already runs in
 * production with the same `OPENAI_API_KEY`.
 */
@Injectable()
export class OpenAiCoachFeedbackProvider implements CoachFeedbackProvider {
  private readonly logger = new Logger(OpenAiCoachFeedbackProvider.name);
  readonly name = 'openai' as const;

  get model(): string {
    return process.env.COACH_OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  }

  get configured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  async generate(request: CoachFeedbackRequest): Promise<unknown> {
    if (!this.configured) throw new CoachFeedbackError('AUTHENTICATION', false);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await this.requestOnce(request);
      } catch (error) {
        const failure =
          error instanceof CoachFeedbackError
            ? error
            : new CoachFeedbackError('UNAVAILABLE', true);
        this.logger.warn(`Coach feedback attempt ${attempt + 1}: ${failure.code}`);
        if (!failure.retryable || attempt === 1) throw failure;
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    throw new CoachFeedbackError('UNAVAILABLE', true);
  }

  private async requestOnce(request: CoachFeedbackRequest): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          store: false,
          max_output_tokens: 700,
          instructions: coachInstructions(request.locale),
          input: JSON.stringify(request),
          text: {
            format: {
              type: 'json_schema',
              name: 'swing_coach_feedback',
              strict: true,
              schema: COACH_FEEDBACK_SCHEMA,
            },
          },
        }),
      });
    } catch (error) {
      throw new CoachFeedbackError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'TIMEOUT'
          : 'UNAVAILABLE',
        true,
      );
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new CoachFeedbackError('AUTHENTICATION', false);
      if (response.status === 429)
        throw new CoachFeedbackError('RATE_LIMITED', true);
      throw new CoachFeedbackError(
        response.status >= 500 ? 'UNAVAILABLE' : 'INVALID_RESPONSE',
        response.status >= 500,
      );
    }
    const raw = await response.text();
    if (raw.length > 200_000)
      throw new CoachFeedbackError('INVALID_RESPONSE', false);
    let payload: {
      status?: string;
      output?: { content?: { type?: string; text?: string }[] }[];
    };
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new CoachFeedbackError('INVALID_RESPONSE', false);
    }
    if (payload.status !== 'completed')
      throw new CoachFeedbackError('INVALID_RESPONSE', false);
    const content = payload.output?.flatMap((part) => part.content ?? []) ?? [];
    if (content.some((part) => part.type === 'refusal'))
      throw new CoachFeedbackError('REFUSED', false);
    const text = content.find((part) => part.type === 'output_text')?.text;
    if (!text) throw new CoachFeedbackError('INVALID_RESPONSE', false);
    try {
      return JSON.parse(text);
    } catch {
      throw new CoachFeedbackError('INVALID_RESPONSE', false);
    }
  }
}
