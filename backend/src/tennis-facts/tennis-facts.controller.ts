import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { requestLocale } from '../common/i18n/request-locale';
import { TennisFactsService } from './tennis-facts.service';

@Controller('tennis-facts')
@UseGuards(JwtAuthGuard)
export class TennisFactsController {
  constructor(private readonly facts: TennisFactsService) {}

  /** `{ fact: null }` when no facts are published — not a 404, since an
   * empty catalogue is a normal state the Home screen simply skips. */
  @Get('today')
  async today(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return { fact: await this.facts.today(userId, requestLocale(req)) };
  }

  @Get(':id')
  byId(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { userId } = req.user as { userId: string };
    return this.facts.byId(userId, id, requestLocale(req));
  }

  @Post(':id/open')
  @HttpCode(200)
  open(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { userId } = req.user as { userId: string };
    return this.facts.markOpened(userId, id);
  }
}

/** Public image route: fact photos are not sensitive and `Image.network`
 * on mobile (and the admin preview) fetch without a bearer token. */
@Controller('media/tennis-fact-images')
export class TennisFactMediaController {
  constructor(private readonly facts: TennisFactsService) {}

  @Get(':id')
  async content(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const image = await this.facts.imageContent(id);
    res.setHeader('Content-Type', image.mimeType);
    // The URL carries a `?v=` version, so a replaced image gets a new URL.
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${image.filename.replaceAll('"', '')}"`,
    );
    res.send(Buffer.from(image.bytes));
  }
}
