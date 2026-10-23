import { Injectable } from '@nestjs/common';
import { NewsAiProvider, NewsAiProviderError, NewsAiRequest } from './news-ai.provider';

@Injectable()
export class DisabledNewsAiProvider implements NewsAiProvider {
  readonly name = 'disabled';
  readonly model = 'none';
  readonly configured = false;
  process(_request: NewsAiRequest): Promise<unknown> {
    return Promise.reject(new NewsAiProviderError('UNAVAILABLE', false));
  }
}
