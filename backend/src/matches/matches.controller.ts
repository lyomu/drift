import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { MatchSport } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { AcceptMatchDto } from './dto/respond-match.dto';
import { ProposeTimesDto } from './dto/propose-times.dto';
import {
  AcceptTimeDto,
  CancelMatchDto,
  SuggestCourtDto,
} from './dto/match-actions.dto';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateMatchDto) {
    return this.matches.create(this.userId(req), dto);
  }

  /** `?sport=PADEL` for Padel Match History (M13); omitted/anything else
   * returns every sport, preserving this route's behavior from before. */
  @Get()
  list(
    @Req() req: Request,
    @Query('segment') segment?: 'challenges' | 'active' | 'history' | 'all',
    @Query('sport') sport?: string,
  ) {
    const resolvedSport =
      sport === MatchSport.PADEL ? MatchSport.PADEL : undefined;
    return this.matches.list(this.userId(req), segment ?? 'all', resolvedSport);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.matches.findOne(this.userId(req), id);
  }

  @Patch(':id/accept')
  accept(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AcceptMatchDto,
  ) {
    return this.matches.accept(this.userId(req), id, dto.partnerId);
  }

  @Patch(':id/decline')
  decline(@Req() req: Request, @Param('id') id: string) {
    return this.matches.decline(this.userId(req), id);
  }

  @Post(':id/proposals')
  proposeTimes(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ProposeTimesDto,
  ) {
    return this.matches.proposeTimes(this.userId(req), id, dto);
  }

  @Patch(':id/proposals/accept')
  acceptTime(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AcceptTimeDto,
  ) {
    return this.matches.acceptTime(this.userId(req), id, dto.optionId);
  }

  @Patch(':id/court')
  suggestCourt(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SuggestCourtDto,
  ) {
    return this.matches.suggestCourt(
      this.userId(req),
      id,
      dto.courtName,
      dto.courtNote,
      dto.courtId,
    );
  }

  @Patch(':id/reschedule')
  reschedule(@Req() req: Request, @Param('id') id: string) {
    return this.matches.reschedule(this.userId(req), id);
  }

  @Patch(':id/cancel')
  cancel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CancelMatchDto,
  ) {
    return this.matches.cancel(this.userId(req), id, dto.reason);
  }
}
