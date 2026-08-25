import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { OrganizationAdminService } from './organization-admin.service';
import {
  OverrideClubSubscriptionDto,
  ReviewAdminApprovalDto,
  ReviewEscalatedModerationDto,
  UpdateOrganizationProfileDto,
  UpdateOrganizationStatusDto,
} from './dto/organization-admin.dto';

@Controller('platform-admin/organizations')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.ORGANIZATIONS_MANAGE)
export class OrganizationAdminController {
  constructor(private readonly organizations: OrganizationAdminService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('platformStatus') platformStatus?: string,
    @Query('verification') verification?: string,
    @Query('subscriptionStatus') subscriptionStatus?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.organizations.list({
      search,
      platformStatus,
      verification,
      subscriptionStatus,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('approvals')
  approvals(@Query('status') status?: string, @Query('clubId') clubId?: string) {
    return this.organizations.approvals(status, clubId);
  }

  @Patch('approvals/:membershipId')
  reviewApproval(
    @Req() req: { user: { adminId: string } },
    @Param('membershipId') membershipId: string,
    @Body() dto: ReviewAdminApprovalDto,
  ) {
    return this.organizations.reviewApproval(req.user.adminId, membershipId, dto);
  }

  @Get('subscriptions')
  subscriptions(@Query('status') status?: string, @Query('clubId') clubId?: string) {
    return this.organizations.subscriptions(status, clubId);
  }

  @Get('moderation')
  moderation(@Query('status') status?: string, @Query('clubId') clubId?: string) {
    return this.organizations.moderation(status, clubId);
  }

  @Patch('moderation/:reportId')
  reviewModeration(
    @Req() req: { user: { adminId: string } },
    @Param('reportId') reportId: string,
    @Body() dto: ReviewEscalatedModerationDto,
  ) {
    return this.organizations.reviewModeration(req.user.adminId, reportId, dto);
  }

  @Get(':id/subscription')
  subscriptionDetail(@Param('id') id: string) {
    return this.organizations.subscriptionDetail(id);
  }

  @Patch(':id/subscription')
  overrideSubscription(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: OverrideClubSubscriptionDto,
  ) {
    return this.organizations.overrideSubscription(req.user.adminId, id, dto);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.organizations.detail(id);
  }

  @Patch(':id/profile')
  updateProfile(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationProfileDto,
  ) {
    return this.organizations.updateProfile(req.user.adminId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationStatusDto,
  ) {
    return this.organizations.updateStatus(req.user.adminId, id, dto);
  }
}
