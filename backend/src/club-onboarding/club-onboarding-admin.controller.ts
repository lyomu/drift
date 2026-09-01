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
import { PlatformGuard } from '../platform-admin/guards/platform.guard';
import { PlatformPermissionGuard } from '../platform-admin/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-admin/decorators/require-platform-permission.decorator';
import { ClubOnboardingService } from './club-onboarding.service';
import { ReviewClubRequestDto } from './dto/club-onboarding.dto';

@Controller('platform-admin/club-requests')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.ORGANIZATIONS_MANAGE)
export class ClubOnboardingAdminController {
  constructor(private readonly onboarding: ClubOnboardingService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.onboarding.list(status);
  }

  @Patch(':id')
  review(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: ReviewClubRequestDto,
  ) {
    return this.onboarding.review(req.user.adminId, id, dto);
  }
}
