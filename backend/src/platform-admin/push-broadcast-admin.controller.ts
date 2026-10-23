import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
  count(
    @Query('country') country?: string,
    @Query('audience') audience?: string | string[],
  ) {
    return this.pushBroadcasts.count(
      country,
      (Array.isArray(audience)
        ? audience
        : audience
          ? [audience]
          : []) as never,
    );
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  send(
    @Req() req: { user: { adminId: string } },
    @Body() dto: SendPushBroadcastDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.pushBroadcasts.broadcast(req.user.adminId, dto, image);
  }

  @Delete(':id')
  cancel(@Req() req: { user: { adminId: string } }, @Param('id') id: string) {
    return this.pushBroadcasts.cancel(req.user.adminId, id);
  }
}

/** Public, opaque poster route: FCM and the signed-in mobile app both need to
 * load campaign imagery without a platform-admin bearer token. */
@Controller('media/push-broadcast-images')
export class PushBroadcastMediaController {
  constructor(private readonly pushBroadcasts: PushBroadcastAdminService) {}

  @Get(':id')
  async content(@Param('id') id: string, @Res() res: Response) {
    const image = await this.pushBroadcasts.imageContent(id);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${image.filename.replaceAll('"', '')}"`,
    );
    res.send(Buffer.from(image.bytes));
  }
}
