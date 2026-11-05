import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClubRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { CommunitiesService } from '../communities/communities.service';
import {
  CreateClubCommunityDto,
  UpdateCommunityDto,
  UpdateMemberRoleDto,
} from '../communities/dto/community.dto';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN] as const;

/**
 * The club's own community (type CLUB), managed from club-admin. Club owners
 * and admins act on it through the club guard rather than a community role,
 * so these call the service's `*As` methods directly. The club admin who
 * creates it becomes its owner in the app.
 */
@Controller('clubs/:clubId/community')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubCommunityAdminController {
  constructor(private readonly communities: CommunitiesService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  get(@Param('clubId') clubId: string) {
    return this.communities.forClub(clubId);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Post()
  create(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubCommunityDto,
  ) {
    return this.communities.createForClub(this.userId(req), clubId, dto);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Patch()
  async update(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: UpdateCommunityDto,
  ) {
    const id = await this.communities.clubCommunityId(clubId);
    return this.communities.updateAs(this.userId(req), id, dto);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Post('photo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async uploadPhoto(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('An image file is required.');
    const id = await this.communities.clubCommunityId(clubId);
    return this.communities.uploadPhotoAs(this.userId(req), id, file);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Post('requests/:userId/approve')
  async approve(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('userId') userId: string,
  ) {
    const id = await this.communities.clubCommunityId(clubId);
    return this.communities.approveRequestAs(this.userId(req), id, userId);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Post('requests/:userId/decline')
  async decline(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('userId') userId: string,
  ) {
    const id = await this.communities.clubCommunityId(clubId);
    return this.communities.declineRequestAs(this.userId(req), id, userId);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Delete('members/:userId')
  async removeMember(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('userId') userId: string,
  ) {
    const id = await this.communities.clubCommunityId(clubId);
    return this.communities.removeMemberAs(this.userId(req), id, userId);
  }

  @RequireClubRole(...OWNER_OR_ADMIN)
  @Patch('members/:userId')
  async updateRole(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const id = await this.communities.clubCommunityId(clubId);
    return this.communities.updateRoleAs(this.userId(req), id, userId, dto.role);
  }
}
