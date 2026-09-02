import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  list(@Req() req: Request) {
    return this.notifications.list(this.userId(req));
  }

  @Patch('read-all')
  markAllRead(@Req() req: Request) {
    return this.notifications.markAllRead(this.userId(req));
  }

  @Patch(':id/read')
  markRead(@Req() req: Request, @Param('id') id: string) {
    return this.notifications.markRead(this.userId(req), id);
  }

  /**
   * Claims an FCM token for the calling user. Idempotent — the app re-registers
   * on every launch and on token refresh, and a handset that changes hands
   * moves to its new owner rather than notifying both.
   */
  @Post('devices')
  @HttpCode(HttpStatus.OK)
  registerDevice(@Req() req: Request, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(this.userId(req), dto);
  }

  /**
   * Called on logout. The token travels in the body rather than the path
   * because a URL would put it in nginx's access log; it is a credential for
   * delivering to someone's device.
   */
  @Delete('devices')
  @HttpCode(HttpStatus.OK)
  removeDevice(@Req() req: Request, @Body() dto: RegisterDeviceDto) {
    return this.notifications.removeDevice(this.userId(req), dto.token);
  }

  @Get('preferences')
  getPreferences(@Req() req: Request) {
    return this.notifications.getPreferences(this.userId(req));
  }

  @Patch('preferences')
  updatePreferences(@Req() req: Request, @Body() dto: UpdatePreferencesDto) {
    return this.notifications.updatePreferences(this.userId(req), dto);
  }
}
