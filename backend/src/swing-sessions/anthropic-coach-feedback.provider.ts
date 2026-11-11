import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  COACH_FEEDBACK_SCHEMA,
  CoachFeedbackError,
  type CoachFeedbackProvider,
  type CoachFeedbackRequest,
  coachInstructions,
} from './coach-feedback.provider';

/**
 * Coach feedback through Claude (Messages API, official SDK).
 *
 * - Model defaults to `claude-opus-5-5`; set `COACH_ANTHROPIC_MODEL` to change it
 *   (for example `claude-haiku-5-5` for lower cost).
 * - Structured output via `output_config.format`, so the reply is schema-valid JSON.
 * - Effort `low`: this is a short, simple writing task.
 * - Server-side refusal fallback is enabled (`fallbacks: "default"`).
 * - The SDK retries 408/409/429/5xx and connection errors itself (`maxRetries`).
 */
@Injectable()
export class AnthropicCoachFeedbackProvider implements CoachFeedbackProvider {
  readonly name = 'anthropic' as const;
  private client?: Anthropic;

  get model(): string {
    return process.env.COACH_ANTHROPIC_MODEL?.trim() || 'claude-opus-5-5';
  }

  get configured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }

  private get anthropic(): Anthropic {
    this.client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });
    return this.client;
  }

  async generate(request: CoachFeedbackRequest): Promise<unknown> {
    if (!this.configured) throw new CoachFeedbackError('AUTHENTICATION', false);

    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await this.anthropic.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: coachInstructions(request.locale),
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: COACH_FEEDBACK_SCHEMA },
        },
        messages: [{ role: 'user', content: JSON.stringify(request) }],
      });
    } catch (error) {
      throw this.asCoachError(error);
    }

    if (response.stop_reason === 'refusal')
      throw new CoachFeedbackError('REFUSED', false);
    if (response.stop_reason === 'max_tokens')
      throw new CoachFeedbackError('INVALID_RESPONSE', false);

    const text = response.content.find(
      (block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text',
    )?.text;
    if (!text) throw new CoachFeedbackError('INVALID_RESPONSE', false);
    try {
      return JSON.parse(text);
    } catch {
      throw new CoachFeedbackError('INVALID_RESPONSE', false);
    }
  }

  private asCoachError(error: unknown): CoachFeedbackError {
    if (error instanceof Anthropic.APIConnectionTimeoutError)
      return new CoachFeedbackError('TIMEOUT', true);
    if (
      error instanceof Anthropic.AuthenticationError ||
      error instanceof Anthropic.PermissionDeniedError
    )
      return new CoachFeedbackError('AUTHENTICATION', false);
    if (error instanceof Anthropic.RateLimitError)
      return new CoachFeedbackError('RATE_LIMITED', true);
    if (error instanceof Anthropic.BadRequestError)
      return new CoachFeedbackError('INVALID_RESPONSE', false);
    if (error instanceof Anthropic.InternalServerError)
      return new CoachFeedbackError('UNAVAILABLE', true);
    if (error instanceof Anthropic.APIConnectionError)
      return new CoachFeedbackError('UNAVAILABLE', true);
    if (error instanceof Anthropic.APIError)
      return new CoachFeedbackError(
        (error.status ?? 500) >= 500 ? 'UNAVAILABLE' : 'INVALID_RESPONSE',
        (error.status ?? 500) >= 500,
      );
    return new CoachFeedbackError('UNAVAILABLE', true);
  }
}
