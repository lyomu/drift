export const NEWS_AI_PROVIDER = Symbol('NEWS_AI_PROVIDER');

export interface NewsAiRequest {
  headline: string;
  excerpt: string;
  maxSummaryCharacters: number;
  allowedCategories: string[];
}

export interface NewsAiResult {
  summary: string;
  categorySlug: string;
  tags: string[];
  players: string[];
  tournaments: string[];
  language: string;
  relevanceScore: number;
  confidence: number;
  riskFlags: string[];
}

export interface NewsAiProvider {
  readonly name: string;
  readonly model: string;
  readonly configured: boolean;
  process(request: NewsAiRequest): Promise<unknown>;
}

export class NewsAiProviderError extends Error {
  constructor(
    readonly code:
      | 'TIMEOUT'
      | 'RATE_LIMITED'
      | 'UNAVAILABLE'
      | 'AUTHENTICATION'
      | 'INVALID_RESPONSE'
      | 'INVALID_RESULT'
      | 'REFUSED',
    readonly retryable: boolean,
  ) {
    super(`NEWS_AI_${code}`);
  }
}
