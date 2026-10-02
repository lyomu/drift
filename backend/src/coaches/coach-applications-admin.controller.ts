import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { PlatformGuard } from '../platform-admin/guards/platform.guard';
import { PlatformPermissionGuard } from '../platform-admin/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-admin/decorators/require-platform-permission.decorator';
import { CoachApplicationsService } from './coach-applications.service';
import {
  ListCoachApplicationsDto,
  ReviewCoachApplicationDto,
} from './dto/coach-application.dto';

/**
 * The review queue. USERS_MANAGE rather than ORGANIZATIONS_MANAGE: a coach
 * application decides whether one person's listing goes public, which is a
 * user-trust decision, not a club one.
 */
@Controller('platform-admin/coach-applications')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.USERS_MANAGE)
export class CoachApplicationsAdminController {
  constructor(private readonly applications: CoachApplicationsService) {}

  @Get()
  list(@Query() dto: ListCoachApplicationsDto) {
    return this.applications.list(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applications.findOne(id);
  }

  @Post(':id/decision')
  review(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: ReviewCoachApplicationDto,
  ) {
    return this.applications.review(req.user.adminId, id, dto);
  }
}
