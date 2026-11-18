import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { requestLocale } from '../common/i18n/request-locale';
import { CreateSwingSessionDto } from './dto/swing-session.dto';
import { SwingSessionsService } from './swing-sessions.service';

@Controller('swing-sessions')
@UseGuards(JwtAuthGuard)
export class SwingSessionsController {
  constructor(private readonly swingSessions: SwingSessionsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  /** Save a session's metrics. No video or pose landmarks are accepted. */
  @Post()
  create(@Req() req: Request, @Body() dto: CreateSwingSessionDto) {
    return this.swingSessions.create(this.userId(req), dto);
  }

  @Get()
  list(@Req() req: Request, @Query('take') take?: string) {
    return this.swingSessions.listForUser(
      this.userId(req),
      take ? Number(take) : undefined,
    );
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.swingSessions.findForUser(this.userId(req), id);
  }

  /**
   * Generate coach feedback in the app's language (`Accept-Language`).
   * Rate-limited per client because each call costs an LLM request.
   */
  @Post(':id/feedback')
  @Throttle({ default: { ttl: 3_600_000, limit: 20 } })
  feedback(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.swingSessions.feedback(this.userId(req), id, requestLocale(req));
  }
}
