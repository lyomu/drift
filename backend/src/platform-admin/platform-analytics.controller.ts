import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformAnalyticsService } from './platform-analytics.service';

@Controller('platform-admin/analytics')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.ANALYTICS_READ)
export class PlatformAnalyticsController {
  constructor(private readonly analytics: PlatformAnalyticsService) {}

  @Get('overview')
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.overview(from, to);
  }

  @Get('markets')
  markets(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.markets(from, to);
  }

  @Get('growth')
  growth(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.growth(from, to);
  }

  @Get('revenue')
  revenue(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.revenue(from, to);
  }

  @Get('health')
  health() {
    return this.analytics.health();
  }

  @Post('health/:serviceKey/acknowledge')
  @RequirePlatformPermission(PlatformPermission.SUPPORT_MANAGE)
  acknowledge(
    @Req() req: { user: { adminId: string } },
    @Param('serviceKey') serviceKey: string,
  ) {
    return this.analytics.acknowledgeIncident(req.user.adminId, serviceKey);
  }
}
