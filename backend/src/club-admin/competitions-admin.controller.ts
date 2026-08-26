import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubAuthService } from './club-auth.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { ResultsService } from '../matches/results.service';
import {
  UpdateLeagueDto,
  CreateSeasonDto,
  UpdateSeasonDto,
  IssueSeasonAwardDto,
} from './dto/league.dto';
import {
  ResolveDisputeDto,
  UpdateFixtureDto,
  UpdateRegistrationDto,
} from './dto/fixture-admin.dto';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

/**
 * League/Season/Fixture/Dispute admin routes keyed by their own resource
 * id, not a club id — each handler resolves the owning club first (via
 * `CompetitionsService`'s `leagueClubId`/`seasonClubId`/`fixtureClubId`
 * helpers) and then checks membership through `ClubAuthService`, since
 * `ClubMembershipGuard` only handles routes with a literal `:clubId` param.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class CompetitionsAdminController {
  constructor(
    private readonly competitions: CompetitionsService,
    private readonly results: ResultsService,
    private readonly clubAuth: ClubAuthService,
  ) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  private async assertLeagueAccess(req: Request, leagueId: string) {
    const clubId = await this.competitions.leagueClubId(leagueId);
    if (!clubId)
      throw new BadRequestException('This league has no owning club.');
    await this.clubAuth.assertRole(this.userId(req), clubId, OWNER_OR_ADMIN);
  }

  private async assertSeasonAccess(req: Request, seasonId: string) {
    const clubId = await this.competitions.seasonClubId(seasonId);
    if (!clubId)
      throw new BadRequestException('This season has no owning club.');
    await this.clubAuth.assertRole(this.userId(req), clubId, OWNER_OR_ADMIN);
  }

  private async assertFixtureAccess(req: Request, fixtureId: string) {
    const clubId = await this.competitions.fixtureClubId(fixtureId);
    if (!clubId)
      throw new BadRequestException('This fixture has no owning club.');
    await this.clubAuth.assertRole(this.userId(req), clubId, OWNER_OR_ADMIN);
  }

  @Patch('leagues/:id')
  async updateLeague(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateLeagueDto,
  ) {
    await this.assertLeagueAccess(req, id);
    return this.competitions.updateLeague(id, dto);
  }

  @Post('leagues/:id/seasons')
  async createSeason(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateSeasonDto,
  ) {
    await this.assertLeagueAccess(req, id);
    return this.competitions.createSeason(id, dto);
  }

  @Patch('seasons/:id')
  async updateSeason(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSeasonDto,
  ) {
    await this.assertSeasonAccess(req, id);
    return this.competitions.updateSeason(id, dto);
  }

  @Patch('seasons/:id/registrations/:registrationId')
  async updateRegistration(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('registrationId') registrationId: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    await this.assertSeasonAccess(req, id);
    return this.competitions.updateRegistration(registrationId, dto.status);
  }

  @Post('seasons/:id/generate-fixtures')
  async generateFixtures(@Req() req: Request, @Param('id') id: string) {
    await this.assertSeasonAccess(req, id);
    return this.competitions.adminGenerateFixtures(id);
  }

  @Post('seasons/:id/complete')
  async completeSeason(@Req() req: Request, @Param('id') id: string) {
    await this.assertSeasonAccess(req, id);
    return this.competitions.completeSeason(id);
  }

  @Post('seasons/:id/awards')
  async issueAward(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: IssueSeasonAwardDto,
  ) {
    await this.assertSeasonAccess(req, id);
    return this.competitions.issueSeasonAward(id, this.userId(req), dto);
  }

  @Patch('fixtures/:id')
  async updateFixture(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateFixtureDto,
  ) {
    await this.assertFixtureAccess(req, id);
    return this.competitions.updateFixture(id, dto);
  }

  @Patch('disputes/:fixtureId/resolve')
  async resolveDispute(
    @Req() req: Request,
    @Param('fixtureId') fixtureId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    await this.assertFixtureAccess(req, fixtureId);
    const matchId = await this.competitions.fixtureMatchId(fixtureId);
    if (!matchId) {
      throw new NotFoundException('This fixture has no match to resolve.');
    }
    return this.results.adminResolveDispute(
      matchId,
      this.userId(req),
      dto.ruling,
    );
  }
}
