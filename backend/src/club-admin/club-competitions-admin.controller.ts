import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { CompetitionsService } from '../competitions/competitions.service';
import { CreateLeagueDto } from './dto/league.dto';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

/** Routes with a literal `:clubId` param — league list/create and the
 * disputes queue. Resource-nested routes (a league/fixture id, not
 * a club id) live in `competitions-admin.controller.ts` instead. */
@Controller('clubs/:clubId')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubCompetitionsAdminController {
  constructor(private readonly competitions: CompetitionsService) {}

  @Get('leagues')
  listLeagues(@Param('clubId') clubId: string) {
    return this.competitions.listLeaguesForClub(clubId);
  }

  @Post('leagues')
  @RequireClubRole(...OWNER_OR_ADMIN)
  createLeague(@Param('clubId') clubId: string, @Body() dto: CreateLeagueDto) {
    return this.competitions.createLeague(clubId, dto);
  }

  @Get('disputes')
  listDisputes(@Param('clubId') clubId: string) {
    return this.competitions.listDisputesForClub(clubId);
  }

  @Get('leagues/archive')
  listArchive(@Param('clubId') clubId: string) {
    return this.competitions.listLeagueArchive(clubId);
  }
}
