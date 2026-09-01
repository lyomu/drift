import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { PlatformConfigAdminService } from './platform-config-admin.service';
import {
  DisableIntegrationDto,
  RecordIntegrationCheckDto,
  RotateIntegrationTokenDto,
  UpdateMarketStatusDto,
  UpsertFeatureFlagDto,
  UpsertIntegrationConfigDto,
  UpsertMarketDto,
  UpsertNotificationTemplateDto,
} from './dto/platform-config-admin.dto';

@Controller('platform-admin/platform-config')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.PLATFORM_CONFIG_MANAGE)
export class PlatformConfigAdminController {
  constructor(private readonly platformConfig: PlatformConfigAdminService) {}

  @Get('markets')
  markets(@Query('status') status?: string, @Query('search') search?: string) {
    return this.platformConfig.listMarkets({ status, search });
  }

  @Post('markets')
  createMarket(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertMarketDto,
  ) {
    return this.platformConfig.createMarket(req.user.adminId, dto);
  }

  @Patch('markets/:id')
  updateMarket(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertMarketDto,
  ) {
    return this.platformConfig.updateMarket(req.user.adminId, id, dto);
  }

  @Patch('markets/:id/status')
  updateMarketStatus(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateMarketStatusDto,
  ) {
    return this.platformConfig.updateMarketStatus(req.user.adminId, id, dto);
  }

  @Get('feature-flags')
  featureFlags(
    @Query('status') status?: string,
    @Query('marketId') marketId?: string,
    @Query('search') search?: string,
  ) {
    return this.platformConfig.listFeatureFlags({ status, marketId, search });
  }

  @Post('feature-flags')
  createFeatureFlag(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertFeatureFlagDto,
  ) {
    return this.platformConfig.createFeatureFlag(req.user.adminId, dto);
  }

  @Patch('feature-flags/:id')
  updateFeatureFlag(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertFeatureFlagDto,
  ) {
    return this.platformConfig.updateFeatureFlag(req.user.adminId, id, dto);
  }

  @Get('notification-templates')
  notificationTemplates(
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('search') search?: string,
  ) {
    return this.platformConfig.listNotificationTemplates({
      status,
      channel,
      search,
    });
  }

  @Post('notification-templates')
  createNotificationTemplate(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertNotificationTemplateDto,
  ) {
    return this.platformConfig.createNotificationTemplate(
      req.user.adminId,
      dto,
    );
  }

  @Patch('notification-templates/:id')
  updateNotificationTemplate(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertNotificationTemplateDto,
  ) {
    return this.platformConfig.updateNotificationTemplate(
      req.user.adminId,
      id,
      dto,
    );
  }

  @Post('notification-templates/:id/preview')
  previewNotificationTemplate(@Param('id') id: string) {
    return this.platformConfig.previewNotificationTemplate(id);
  }

  @Get('integrations')
  integrations(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.platformConfig.listIntegrations({ status, search });
  }

  @Post('integrations')
  createIntegration(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertIntegrationConfigDto,
  ) {
    return this.platformConfig.createIntegration(req.user.adminId, dto);
  }

  @Patch('integrations/:id')
  updateIntegration(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertIntegrationConfigDto,
  ) {
    return this.platformConfig.updateIntegration(req.user.adminId, id, dto);
  }

  @Post('integrations/:id/check')
  recordIntegrationCheck(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: RecordIntegrationCheckDto,
  ) {
    return this.platformConfig.recordIntegrationCheck(
      req.user.adminId,
      id,
      dto,
    );
  }

  @Post('integrations/:id/rotate-token')
  rotateIntegrationToken(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: RotateIntegrationTokenDto,
  ) {
    return this.platformConfig.rotateIntegrationToken(
      req.user.adminId,
      id,
      dto,
    );
  }

  @Post('integrations/:id/disable')
  disableIntegration(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: DisableIntegrationDto,
  ) {
    return this.platformConfig.disableIntegration(req.user.adminId, id, dto);
  }
}
