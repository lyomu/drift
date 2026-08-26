import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { TournamentsService } from '../competitions/tournaments.service';
import { LaddersService } from '../competitions/ladders.service';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN] as const;

const ALLOWED_DRAWS = [4, 8, 16, 32];

/**
 * Club Admin management for Wave 6 competitions. Player-facing surfaces
 * live in the competitions module.
 */
@Controller('clubs/:clubId')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class CompetitionsAdminExpansionController {
  constructor(
    private readonly tournaments: TournamentsService,
    private readonly ladders: LaddersService,
  ) {}

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Post('tournaments')
  createTournament(
    @Param('clubId') clubId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      drawSize: number;
      registrationClosesAt: string;
    },
  ) {
    if (!ALLOWED_DRAWS.includes(body.drawSize)) {
      throw new BadRequestException(
        `drawSize must be one of ${ALLOWED_DRAWS.join(', ')}.`,
      );
    }
    return this.tournaments.create(clubId, {
      name: body.name,
      description: body.description,
      drawSize: body.drawSize,
      registrationClosesAt: new Date(body.registrationClosesAt),
    });
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Post('tournaments/:id/generate-draw')
  generateDraw(@Param('id') id: string) {
    return this.tournaments.generateDraw(id);
  }

  @Get('tournaments/:id')
  tournament(@Param('id') id: string) {
    return this.tournaments.detail(id);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Patch('tournaments/:id/seeds')
  updateSeeds(
    @Param('id') id: string,
    @Body() body: { entries: { entryId: string; seed: number }[] },
  ) {
    return this.tournaments.updateSeeds(id, body.entries);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Patch('tournaments/:id/cancel')
  cancelTournament(@Param('id') id: string) {
    return this.tournaments.cancel(id);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Post('ladders')
  createLadder(
    @Param('clubId') clubId: string,
    @Body() body: { name: string; challengeRange?: number },
  ) {
    return this.ladders.create(clubId, body);
  }

  @Get('ladders')
  listLadders(@Param('clubId') clubId: string) {
    return this.ladders.list(clubId);
  }

  @Get('ladders/:id')
  ladder(@Param('id') id: string) {
    return this.ladders.detail(id);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Patch('ladders/:id/positions')
  updatePositions(
    @Param('id') id: string,
    @Body() body: { entries: { entryId: string; position: number }[] },
  ) {
    return this.ladders.updatePositions(id, body.entries);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Patch('ladders/:id/archive')
  archiveLadder(@Param('id') id: string) {
    return this.ladders.archive(id);
  }
}
