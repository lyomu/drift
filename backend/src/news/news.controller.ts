import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NewsService } from './news.service';
import { SearchNewsDto } from './dto/search-news.dto';

@Controller('news')
@UseGuards(JwtAuthGuard)
export class NewsController {
  constructor(private readonly news: NewsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  browse(@Req() req: Request, @Query() dto: SearchNewsDto) {
    return this.news.browse(this.userId(req), dto);
  }

  @Get('saved')
  listSaved(@Req() req: Request) {
    return this.news.listSaved(this.userId(req));
  }

  @Get(':id')
  getStory(@Req() req: Request, @Param('id') id: string) {
    return this.news.getStory(this.userId(req), id);
  }

  @Post(':id/save')
  save(@Req() req: Request, @Param('id') id: string) {
    return this.news.save(this.userId(req), id);
  }

  @Delete(':id/save')
  unsave(@Req() req: Request, @Param('id') id: string) {
    return this.news.unsave(this.userId(req), id);
  }
}
