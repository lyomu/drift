import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

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

  @Get('preferences')
  getPreferences(@Req() req: Request) {
    return this.notifications.getPreferences(this.userId(req));
  }

  @Patch('preferences')
  updatePreferences(@Req() req: Request, @Body() dto: UpdatePreferencesDto) {
    return this.notifications.updatePreferences(this.userId(req), dto);
  }
}
