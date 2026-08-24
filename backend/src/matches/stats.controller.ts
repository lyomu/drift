import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { MatchSport } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { getPlayerStats } from './stats.util';

/**
 * Mounted at `/me/stats` rather than under `/matches` — a static path like
 * `/matches/stats` would collide with `MatchesController`'s
 * `GET /matches/:id` route matching "stats" as an id.
 */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  /** `?sport=PADEL` for Padel Match History & Stats (M13); defaults to
   * TENNIS, preserving this route's behavior from every phase before it. */
  @Get('stats')
  stats(@Req() req: Request, @Query('sport') sport?: string) {
    const { userId } = req.user as { userId: string };
    const resolvedSport =
      sport === MatchSport.PADEL ? MatchSport.PADEL : MatchSport.TENNIS;
    return getPlayerStats(this.prisma, userId, resolvedSport);
  }
}
