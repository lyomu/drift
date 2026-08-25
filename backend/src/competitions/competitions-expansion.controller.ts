import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';
import { LaddersService } from './ladders.service';
import type { Request } from 'express';

/**
 * Player-facing read/challenge surface for Wave 6 competitions. Management
 * (create/draw/archive) lives in the Club Admin module.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class CompetitionsExpansionController {
  constructor(
    private readonly tournaments: TournamentsService,
    private readonly ladders: LaddersService,
  ) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  // ------------------------------------------------------------ tournaments

  @Get('tournaments')
  list(@Query('clubId') clubId?: string) {
    return this.tournaments.list(clubId);
  }

  @Get('tournaments/:id')
  detail(@Param('id') id: string) {
    return this.tournaments.detail(id);
  }

  @Post('tournaments/:id/entries')
  join(@Req() req: Request, @Param('id') id: string) {
    return this.tournaments.join(id, this.userId(req));
  }

  @Delete('tournaments/:id/entries')
  leave(@Req() req: Request, @Param('id') id: string) {
    return this.tournaments.leave(id, this.userId(req));
  }

  // --------------------------------------------------------------- ladders

  @Get('ladders')
  listLadders(@Query('clubId') clubId?: string) {
    return this.ladders.list(clubId);
  }

  @Get('ladders/:id')
  detailLadder(@Req() req: Request, @Param('id') id: string) {
    return this.ladders.detail(id, this.userId(req));
  }

  @Post('ladders/:id/entries')
  joinLadder(@Req() req: Request, @Param('id') id: string) {
    return this.ladders.join(id, this.userId(req));
  }

  @Post('ladders/:id/challenges')
  challenge(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { defenderUserId: string },
  ) {
    return this.ladders.challenge(id, this.userId(req), body.defenderUserId);
  }

  @Post('ladders/challenges/:id/accept')
  accept(@Req() req: Request, @Param('id') id: string) {
    return this.ladders.accept(this.userId(req), id);
  }

  @Post('ladders/challenges/:id/decline')
  decline(@Req() req: Request, @Param('id') id: string) {
    return this.ladders.decline(this.userId(req), id);
  }
}
