import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformAdminService } from './platform-admin.service';
import {
  LoginPlatformAdminDto,
  ModerateStoryDto,
  RuleDisputeDto,
  UpdateReportDto,
  UpdateUserStatusDto,
  UpsertNewsSourceDto,
} from './dto/platform-admin.dto';

@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private readonly platform: PlatformAdminService) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginPlatformAdminDto) {
    return this.platform.login(dto.email, dto.password);
  }

  @UseGuards(PlatformGuard)
  @Get('users')
  listUsers(
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.platform.listUsers({
      query,
      status,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @UseGuards(PlatformGuard)
  @Patch('users/:id/status')
  setUserStatus(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.platform.setUserStatus(req.user.adminId, id, dto.status);
  }

  @UseGuards(PlatformGuard)
  @Get('reports/:type')
  listReports(
    @Param('type') type: 'player' | 'message' | 'court',
    @Query('status') status?: string,
  ) {
    return this.platform.listReports(type, status);
  }

  @UseGuards(PlatformGuard)
  @Patch('reports/:type/:id')
  updateReport(
    @Req() req: { user: { adminId: string } },
    @Param('type') type: 'player' | 'message' | 'court',
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.platform.updateReport(req.user.adminId, type, id, dto.status);
  }

  @UseGuards(PlatformGuard)
  @Get('news/sources')
  listNewsSources() {
    return this.platform.listNewsSources();
  }

  @UseGuards(PlatformGuard)
  @Post('news/sources')
  createNewsSource(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertNewsSourceDto,
  ) {
    return this.platform.createNewsSource(req.user.adminId, dto);
  }

  @UseGuards(PlatformGuard)
  @Patch('news/sources/:id')
  updateNewsSource(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertNewsSourceDto,
  ) {
    return this.platform.updateNewsSource(req.user.adminId, id, dto);
  }

  @UseGuards(PlatformGuard)
  @Get('news/stories')
  listStories(
    @Query('moderation') moderation?: string,
    @Query('sourceId') sourceId?: string,
  ) {
    return this.platform.listStories(moderation, sourceId);
  }

  @UseGuards(PlatformGuard)
  @Patch('news/stories/:id/moderation')
  moderateStory(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: ModerateStoryDto,
  ) {
    return this.platform.moderateStory(req.user.adminId, id, dto.moderationStatus);
  }

  @UseGuards(PlatformGuard)
  @Get('disputes')
  listDisputes() {
    return this.platform.listDisputes();
  }

  @UseGuards(PlatformGuard)
  @Post('disputes/:matchId/rule')
  ruleOnDispute(
    @Req() req: { user: { adminId: string } },
    @Param('matchId') matchId: string,
    @Body() dto: RuleDisputeDto,
  ) {
    return this.platform.ruleOnDispute(req.user.adminId, matchId, dto.ruling);
  }

  @UseGuards(PlatformGuard)
  @Get('audit-logs')
  listAuditLogs(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.platform.listAuditLogs({
      actorId,
      action,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }
}
