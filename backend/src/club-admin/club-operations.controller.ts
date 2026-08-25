import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClubPostModerationStatus, ClubRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubOperationsService } from './club-operations.service';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { ClubMembershipGuard } from './guards/club-membership.guard';

const MANAGERS = [ClubRole.OWNER, ClubRole.ADMIN];
const CONTENT_MANAGERS = [ClubRole.OWNER, ClubRole.ADMIN, ClubRole.CONTENT_MANAGER];

@Controller('clubs/:clubId')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubOperationsController {
  constructor(private readonly operations: ClubOperationsService) {}

  private userId(req: Request) {
    return (req.user as { userId: string }).userId;
  }

  private range(from?: string, to?: string) {
    return { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
  }

  @Get('media')
  media(@Param('clubId') clubId: string) {
    return this.operations.listMedia(clubId);
  }

  @Post('media')
  @RequireClubRole(...CONTENT_MANAGERS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadMedia(@Req() req: Request, @Param('clubId') clubId: string, @UploadedFile() file: Express.Multer.File, @Body('caption') caption?: string) {
    if (!file) throw new BadRequestException('An image file is required.');
    return this.operations.uploadMedia(clubId, this.userId(req), file, caption);
  }

  @Get('media/:id/content')
  async mediaContent(@Param('clubId') clubId: string, @Param('id') id: string, @Res() res: Response) {
    const asset = await this.operations.mediaContent(clubId, id);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${asset.filename.replaceAll('"', '')}"`);
    res.send(Buffer.from(asset.bytes));
  }

  @Delete('media/:id')
  @RequireClubRole(...CONTENT_MANAGERS)
  deleteMedia(@Req() req: Request, @Param('clubId') clubId: string, @Param('id') id: string) {
    return this.operations.deleteMedia(clubId, id, this.userId(req));
  }

  @Get('moderation')
  @RequireClubRole(...CONTENT_MANAGERS)
  moderation(@Param('clubId') clubId: string, @Query('status') status?: ClubPostModerationStatus) {
    return this.operations.moderationQueue(clubId, status);
  }

  @Patch('moderation/:id')
  @RequireClubRole(...CONTENT_MANAGERS)
  resolveModeration(@Req() req: Request, @Param('clubId') clubId: string, @Param('id') id: string, @Body('status') status: ClubPostModerationStatus) {
    return this.operations.resolveModeration(clubId, id, this.userId(req), status);
  }

  @Get('notification-settings')
  @RequireClubRole(...MANAGERS)
  notificationSettings(@Param('clubId') clubId: string) {
    return this.operations.getNotificationSettings(clubId);
  }

  @Patch('notification-settings')
  @RequireClubRole(...MANAGERS)
  updateNotificationSettings(@Req() req: Request, @Param('clubId') clubId: string, @Body() body: { membershipChanges?: boolean; competitionUpdates?: boolean; eventRegistrations?: boolean; moderationAlerts?: boolean; weeklyDigest?: boolean }) {
    return this.operations.updateNotificationSettings(clubId, this.userId(req), body);
  }

  @Get('audit-log')
  @RequireClubRole(...MANAGERS)
  auditLog(@Param('clubId') clubId: string, @Query('action') action?: string, @Query('actorId') actorId?: string) {
    return this.operations.auditLog(clubId, action, actorId);
  }

  @Get('analytics/engagement')
  engagement(@Param('clubId') clubId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.operations.engagement(clubId, this.range(from, to));
  }

  @Get('analytics/courts')
  courtInquiries(@Param('clubId') clubId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.operations.courtInquiries(clubId, this.range(from, to));
  }

  @Get('analytics/events')
  eventReport(@Param('clubId') clubId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.operations.eventReport(clubId, this.range(from, to));
  }

  @Get('members.csv')
  async membersCsv(@Param('clubId') clubId: string, @Res() res: Response) {
    const csv = await this.operations.membersCsv(clubId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    res.send(csv);
  }
}
