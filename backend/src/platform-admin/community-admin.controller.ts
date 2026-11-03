import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommunityStatus, PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { AuditService } from './audit.service';
import { CommunitiesService } from '../communities/communities.service';
import { ReviewCommunityDto } from '../communities/dto/community.dto';

type AdminRequest = { user: { adminId: string } };

/**
 * Community review and moderation (2026-11). Every player-created and club
 * community lands here as PENDING; nobody but its creator can find it until
 * it is approved. Moderation sits with trust & safety, alongside the
 * community reports in Reports.
 */
@Controller('platform-admin/communities')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.TRUST_SAFETY_MANAGE)
export class CommunityAdminController {
  constructor(
    private readonly communities: CommunitiesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query('status') status?: string, @Query('q') q?: string) {
    if (
      status &&
      !Object.values(CommunityStatus).includes(status as CommunityStatus)
    ) {
      throw new BadRequestException('Unknown community status.');
    }
    return this.communities.adminList(status as CommunityStatus | undefined, q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.communities.adminDetail(id);
  }

  @Patch(':id/approve')
  async approve(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReviewCommunityDto,
  ) {
    const result = await this.communities.approve(req.user.adminId, id, dto.note);
    await this.audit.record(req.user.adminId, 'COMMUNITY_APPROVED', 'Community', id, {
      note: dto.note ?? null,
    });
    return result;
  }

  @Patch(':id/reject')
  async reject(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReviewCommunityDto,
  ) {
    const result = await this.communities.reject(req.user.adminId, id, dto.note);
    await this.audit.record(req.user.adminId, 'COMMUNITY_REJECTED', 'Community', id, {
      note: dto.note ?? null,
    });
    return result;
  }

  @Patch(':id/suspend')
  async suspend(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReviewCommunityDto,
  ) {
    const result = await this.communities.suspend(req.user.adminId, id, dto.note);
    await this.audit.record(req.user.adminId, 'COMMUNITY_SUSPENDED', 'Community', id, {
      note: dto.note ?? null,
    });
    return result;
  }

  @Patch(':id/restore')
  async restore(@Req() req: AdminRequest, @Param('id') id: string) {
    const result = await this.communities.restore(req.user.adminId, id);
    await this.audit.record(req.user.adminId, 'COMMUNITY_RESTORED', 'Community', id);
    return result;
  }

  @Delete(':id')
  async remove(@Req() req: AdminRequest, @Param('id') id: string) {
    await this.communities.deleteWithNotice(id);
    await this.audit.record(req.user.adminId, 'COMMUNITY_DELETED', 'Community', id);
    return { deleted: true };
  }
}
