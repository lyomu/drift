import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { ClubsAdminService } from './clubs-admin.service';
import { UpdateClubDto } from './dto/club.dto';
import { InviteMemberDto, UpdateMembershipDto } from './dto/membership.dto';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

@Controller('clubs')
@UseGuards(JwtAuthGuard)
export class ClubsAdminController {
  constructor(private readonly clubsAdmin: ClubsAdminService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  // Self-service `POST /clubs` was removed — clubs are now born only from an
  // approved ClubCreationRequest (see `club-onboarding/`).

  @Get('me/memberships')
  myMemberships(@Req() req: Request) {
    return this.clubsAdmin.myMemberships(this.userId(req));
  }

  @Post(':clubId/complete-setup')
  @UseGuards(ClubMembershipGuard)
  @RequireClubRole(...OWNER_OR_ADMIN)
  completeSetup(@Param('clubId') clubId: string) {
    return this.clubsAdmin.completeSetup(clubId);
  }

  // Deliberately NOT behind ClubMembershipGuard — the whole point is that
  // the caller isn't a member yet.
  @Post(':clubId/join')
  requestToJoin(@Req() req: Request, @Param('clubId') clubId: string) {
    return this.clubsAdmin.requestToJoin(clubId, this.userId(req));
  }

  @Delete(':clubId/join')
  leave(@Req() req: Request, @Param('clubId') clubId: string) {
    return this.clubsAdmin.leave(clubId, this.userId(req));
  }

  @Patch(':clubId')
  @UseGuards(ClubMembershipGuard)
  @RequireClubRole(...OWNER_OR_ADMIN)
  update(@Param('clubId') clubId: string, @Body() dto: UpdateClubDto) {
    return this.clubsAdmin.updateClub(clubId, dto);
  }

  @Post(':clubId/verification-request')
  @UseGuards(ClubMembershipGuard)
  @RequireClubRole(...OWNER_OR_ADMIN)
  submitVerificationRequest(
    @Req() req: Request,
    @Param('clubId') clubId: string,
  ) {
    return this.clubsAdmin.submitVerificationRequest(clubId, this.userId(req));
  }

  @Get(':clubId/members')
  @UseGuards(ClubMembershipGuard)
  listMembers(@Param('clubId') clubId: string) {
    return this.clubsAdmin.listMembers(clubId);
  }

  @Post(':clubId/members')
  @UseGuards(ClubMembershipGuard)
  @RequireClubRole(...OWNER_OR_ADMIN)
  inviteMember(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.clubsAdmin.inviteMember(clubId, dto, this.userId(req));
  }

  @Patch(':clubId/members/:membershipId')
  @UseGuards(ClubMembershipGuard)
  @RequireClubRole(...OWNER_OR_ADMIN)
  updateMembership(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.clubsAdmin.updateMembership(
      clubId,
      membershipId,
      dto,
      this.userId(req),
    );
  }

  @Delete(':clubId/members/:membershipId')
  @UseGuards(ClubMembershipGuard)
  @RequireClubRole(...OWNER_OR_ADMIN)
  removeMember(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.clubsAdmin.removeMember(clubId, membershipId, this.userId(req));
  }
}
