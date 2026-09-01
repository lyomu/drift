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

  @Get('me/leagues')
  getMyLeagues(@Req() req: Request) {
    return this.competitions.getMyLeagues(this.userId(req));
  }

  @Get('leagues/:id')
  getLeague(@Req() req: Request, @Param('id') id: string) {
    return this.competitions.getLeague(id, this.userId(req));
  }

  @Get('leagues/:id/registrations')
  getRegisteredPlayers(@Param('id') id: string) {
    return this.competitions.getRegisteredPlayers(id);
  }

  @Post('leagues/:id/register')
  register(@Req() req: Request, @Param('id') id: string) {
    return this.competitions.register(this.userId(req), id);
  }

  @Delete('leagues/:id/register')
  withdraw(@Req() req: Request, @Param('id') id: string) {
    return this.competitions.withdraw(this.userId(req), id);
  }

  @Get('leagues/:id/rounds/current')
  getCurrentRound(@Param('id') id: string) {
    return this.competitions.getCurrentRound(id);
  }

  @Get('leagues/:id/rounds/:roundId')
  getRound(@Param('id') id: string, @Param('roundId') roundId: string) {
    return this.competitions.getRound(id, roundId);
  }

  @Get('leagues/:id/standings')
  getStandings(@Param('id') id: string) {
    return this.competitions.getStandings(id);
  }
}
