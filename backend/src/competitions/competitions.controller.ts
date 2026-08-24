import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompetitionsService } from './competitions.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class CompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get('leagues')
  listLeagues() {
    return this.competitions.listLeagues();
  }

  @Get('leagues/:id')
  getLeague(@Param('id') id: string) {
    return this.competitions.getLeague(id);
  }

  @Get('seasons/:id')
  getSeason(@Req() req: Request, @Param('id') id: string) {
    return this.competitions.getSeason(id, this.userId(req));
  }

  @Get('seasons/:id/registrations')
  getRegisteredPlayers(@Param('id') id: string) {
    return this.competitions.getRegisteredPlayers(id);
  }

  @Post('seasons/:id/register')
  register(@Req() req: Request, @Param('id') id: string) {
    return this.competitions.register(this.userId(req), id);
  }

  @Delete('seasons/:id/register')
  withdraw(@Req() req: Request, @Param('id') id: string) {
    return this.competitions.withdraw(this.userId(req), id);
  }

  @Get('me/seasons')
  getMySeasons(@Req() req: Request) {
    return this.competitions.getMySeasons(this.userId(req));
  }

  @Get('seasons/:id/rounds/current')
  getCurrentRound(@Param('id') id: string) {
    return this.competitions.getCurrentRound(id);
  }

  @Get('seasons/:id/rounds/:roundId')
  getRound(@Param('id') id: string, @Param('roundId') roundId: string) {
    return this.competitions.getRound(id, roundId);
  }

  @Get('seasons/:id/standings')
  getStandings(@Param('id') id: string) {
    return this.competitions.getStandings(id);
  }
}
