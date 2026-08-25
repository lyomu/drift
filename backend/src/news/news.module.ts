import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsIngestionService } from './news-ingestion.service';

@Module({
  controllers: [NewsController],
  providers: [NewsService, NewsIngestionService],
})
export class NewsModule {}
