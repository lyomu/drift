import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { PushBroadcastAdminService } from './push-broadcast-admin.service';
import { SendPushBroadcastDto } from './dto/push-broadcast-admin.dto';

/**
 * Push notifications sent from platform admin to app users. Guarded like
 * every other platform-admin surface and gated on SUPPORT_MANAGE — the same
 * permission the waitlist broadcast reuses, for the same reason: "talks to
 * people." A send is a consequential, irreversible action reaching real
 * devices, so it is audit-logged by the service before this controller
 * returns.
 */
@Controller('platform-admin/push-broadcasts')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.SUPPORT_MANAGE)
export class PushBroadcastAdminController {
  constructor(private readonly pushBroadcasts: PushBroadcastAdminService) {}

  @Get()
  overview() {
    return this.pushBroadcasts.overview();
  }

  @Get('count')
  count(@Query('country') country?: string) {
    return this.pushBroadcasts.count(country);
  }

  @Post()
  send(
    @Req() req: { user: { adminId: string } },
    @Body() dto: SendPushBroadcastDto,
  ) {
    return this.pushBroadcasts.broadcast(req.user.adminId, dto);
  }
}
