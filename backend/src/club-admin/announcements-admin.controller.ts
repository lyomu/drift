import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClubMembership, ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { AnnouncementsAdminService } from './announcements-admin.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

@Controller('clubs/:clubId/announcements')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class AnnouncementsAdminController {
  constructor(private readonly announcements: AnnouncementsAdminService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  list(@Req() req: Request, @Param('clubId') clubId: string) {
    const membership = (req as Request & { clubMembership?: ClubMembership })
      .clubMembership;
    return this.announcements.list(clubId, membership?.role);
  }

  @Post()
  @RequireClubRole(...OWNER_OR_ADMIN)
  create(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcements.create(clubId, this.userId(req), dto);
  }

  @Patch(':id')
  @RequireClubRole(...OWNER_OR_ADMIN)
  update(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcements.update(clubId, id, dto);
  }
}
