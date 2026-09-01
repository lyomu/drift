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
import { AccessControlService } from './access-control.service';
import { PlatformPermission } from '@prisma/client';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import {
  ForgotPlatformAdminPasswordDto,
  LoginPlatformAdminDto,
  ModerateStoryDto,
  ResetPlatformAdminPasswordDto,
  RuleDisputeDto,
  UpdateReportDto,
  UpdateUserStatusDto,
  UpdateUserVerificationDto,
  UpsertNewsSourceDto,
} from './dto/platform-admin.dto';
import {
  AcceptPlatformAdminInviteDto,
  ResendPlatformTwoFactorDto,
  VerifyPlatformTwoFactorDto,
} from './dto/access-control.dto';

@Controller('platform-admin')
export class PlatformAdminController {
  constructor(
    private readonly platform: PlatformAdminService,
    private readonly access: AccessControlService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginPlatformAdminDto) {
    return this.platform.login(dto.email, dto.password);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/verify-2fa')
  @HttpCode(HttpStatus.OK)
  verifyTwoFactor(@Body() dto: VerifyPlatformTwoFactorDto) {
    return this.platform.verifyTwoFactor(dto.challengeToken, dto.code);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('auth/resend-2fa')
  @HttpCode(HttpStatus.OK)
  resendTwoFactor(@Body() dto: ResendPlatformTwoFactorDto) {
    return this.platform.resendTwoFactor(dto.challengeToken);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPlatformAdminPasswordDto) {
    return this.platform.forgotPassword(dto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPlatformAdminPasswordDto) {
    return this.platform.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  // The invite token is 256-bit random, so this is defence in depth rather
  // than a live hole — but it was the one unauthenticated auth route on this
  // controller without a limit, and staff-account creation is the last place
  // to leave an unmetered endpoint.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/accept-invite')
  acceptInvite(@Body() dto: AcceptPlatformAdminInviteDto) {
    return this.access.acceptInvite(dto.token, dto.name, dto.password);
  }

  @UseGuards(PlatformGuard)
  @Get('auth/me')
  me(@Req() req: { user: { adminId: string } }) {
    return this.access.currentAdmin(req.user.adminId);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.USERS_MANAGE)
  @Get('users')
  listUsers(
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.platform.listUsers({
      query,
      status,
      category,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.USERS_MANAGE)
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.platform.getUserDetail(id);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.USERS_MANAGE)
  @Patch('users/:id/status')
  setUserStatus(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.platform.setUserStatus(req.user.adminId, id, dto.status);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.USERS_MANAGE)
  @Patch('users/:id/verification')
  setUserVerification(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserVerificationDto,
  ) {
    return this.platform.setUserVerification(req.user.adminId, id, dto.status);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.USERS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @Post('users/:id/revoke-sessions')
  revokeUserSessions(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
  ) {
    return this.platform.revokeUserSessions(req.user.adminId, id);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.TRUST_SAFETY_MANAGE)
  @Get('reports/:type')
  listReports(
    @Param('type') type: 'player' | 'message' | 'court',
    @Query('status') status?: string,
  ) {
    return this.platform.listReports(type, status);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.TRUST_SAFETY_MANAGE)
  @Patch('reports/:type/:id')
  updateReport(
    @Req() req: { user: { adminId: string } },
    @Param('type') type: 'player' | 'message' | 'court',
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.platform.updateReport(req.user.adminId, type, id, dto.status);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.CONTENT_MANAGE)
  @Get('news/sources')
  listNewsSources() {
    return this.platform.listNewsSources();
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.CONTENT_MANAGE)
  @Post('news/sources')
  createNewsSource(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertNewsSourceDto,
  ) {
    return this.platform.createNewsSource(req.user.adminId, dto);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.CONTENT_MANAGE)
  @Patch('news/sources/:id')
  updateNewsSource(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertNewsSourceDto,
  ) {
    return this.platform.updateNewsSource(req.user.adminId, id, dto);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.CONTENT_MANAGE)
  @Get('news/stories')
  listStories(
    @Query('moderation') moderation?: string,
    @Query('sourceId') sourceId?: string,
  ) {
    return this.platform.listStories(moderation, sourceId);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.CONTENT_MANAGE)
  @Patch('news/stories/:id/moderation')
  moderateStory(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: ModerateStoryDto,
  ) {
    return this.platform.moderateStory(
      req.user.adminId,
      id,
      dto.moderationStatus,
    );
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.COMPETITIONS_MANAGE)
  @Get('disputes')
  listDisputes() {
    return this.platform.listDisputes();
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.COMPETITIONS_MANAGE)
  @Post('disputes/:matchId/rule')
  ruleOnDispute(
    @Req() req: { user: { adminId: string } },
    @Param('matchId') matchId: string,
    @Body() dto: RuleDisputeDto,
  ) {
    return this.platform.ruleOnDispute(req.user.adminId, matchId, dto.ruling);
  }

  @UseGuards(PlatformGuard, PlatformPermissionGuard)
  @RequirePlatformPermission(PlatformPermission.AUDIT_READ)
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
