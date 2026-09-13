import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { WaitlistAdminService } from './waitlist-admin.service';
import { SendWaitlistBroadcastDto } from './dto/waitlist-admin.dto';

/**
 * The launch waitlist, managed from platform admin. Guarded like every other
 * platform-admin surface and gated on SUPPORT_MANAGE — the same permission
 * that owns support tickets and privacy requests, i.e. "talks to people by
 * email". A broadcast is a consequential action, so it is audit-logged by the
 * service before this controller returns.
 */
@Controller('platform-admin/waitlist')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.SUPPORT_MANAGE)
export class WaitlistAdminController {
  constructor(private readonly waitlist: WaitlistAdminService) {}

  /** List slice + counters in one read, so the page opens with one request. */
  @Get()
  overview(
    @Query('audience') audience?: string,
    @Query('search') search?: string,
  ) {
    return this.waitlist.overview({ audience, search });
  }

  /** The whole list as CSV for the mail provider's import. */
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="drift-tennis-waitlist.csv"',
  )
  exportCsv() {
    return this.waitlist.exportCsv();
  }

  /** Past sends, newest first — the guard against double-emailing the list. */
  @Get('broadcasts')
  broadcasts() {
    return this.waitlist.listBroadcasts();
  }

  @Post('broadcast')
  broadcast(
    @Req() req: { user: { adminId: string } },
    @Body() dto: SendWaitlistBroadcastDto,
  ) {
    return this.waitlist.broadcast(req.user.adminId, dto);
  }
}
