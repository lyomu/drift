import { Module } from '@nestjs/common';
import { AnthropicCoachFeedbackProvider } from './anthropic-coach-feedback.provider';
import { COACH_FEEDBACK_PROVIDERS } from './coach-feedback.provider';
import { OpenAiCoachFeedbackProvider } from './openai-coach-feedback.provider';
import { SwingSessionsController } from './swing-sessions.controller';
import { SwingSessionsService } from './swing-sessions.service';

/**
 * Swing Check (docs/ml/SWING_METRICS_SPEC.md). The phone measures swings with
 * on-device pose detection; this module stores the numbers and writes optional
 * coach feedback with whichever LLM key the server has (Claude first, then OpenAI).
 */
@Module({
  controllers: [SwingSessionsController],
  providers: [
    SwingSessionsService,
    AnthropicCoachFeedbackProvider,
    OpenAiCoachFeedbackProvider,
    {
      provide: COACH_FEEDBACK_PROVIDERS,
      inject: [AnthropicCoachFeedbackProvider, OpenAiCoachFeedbackProvider],
      useFactory: (
        anthropic: AnthropicCoachFeedbackProvider,
        openai: OpenAiCoachFeedbackProvider,
      ) => [anthropic, openai],
    },
  ],
})
export class SwingSessionsModule {}
