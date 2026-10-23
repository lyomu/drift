import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsIngestionService } from './news-ingestion.service';
import { NewsAiService } from './news-ai.service';
import { NEWS_AI_PROVIDER } from './news-ai.provider';
import { OpenAiNewsAiProvider } from './openai-news-ai.provider';
import { DisabledNewsAiProvider } from './disabled-news-ai.provider';

@Module({
  controllers: [NewsController],
  providers: [NewsService, NewsIngestionService, NewsAiService,
    OpenAiNewsAiProvider, DisabledNewsAiProvider,
    {
      provide: NEWS_AI_PROVIDER,
      useFactory: (openai: OpenAiNewsAiProvider, disabled: DisabledNewsAiProvider) =>
        process.env.NEWS_AI_PROVIDER === 'openai' ? openai : disabled,
      inject: [OpenAiNewsAiProvider, DisabledNewsAiProvider],
    }],
  exports: [NewsIngestionService],
})
export class NewsModule {}
