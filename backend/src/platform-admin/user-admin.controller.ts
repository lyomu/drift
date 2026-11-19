import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlatformPermission } from '@prisma/client';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { UserAdminService } from './user-admin.service';
import { UpdateUserProfileDto } from './dto/platform-admin.dto';
import {
  ReasonDto,
  SetClubMembershipDto,
  SetCoachListingDto,
  SetUserStatusDto,
  SetUserVerificationDto,
} from './dto/user-admin.dto';

type AdminRequest = { user: { adminId: string } };

const toNumber = (value?: string) => (value ? Number(value) : undefined);

/**
 * Platform user management. Every route requires a platform-admin token AND
 * USERS_MANAGE, enforced server-side by the guards below; club admins have no
 * route here (their member tools live under `club-admin` and are scoped to
 * their own club). The class-level guards mean a new route added here cannot
 * forget them.
 */
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.USERS_MANAGE)
@Controller('platform-admin/users')
export class UserAdminController {
  constructor(private readonly users: UserAdminService) {}

  @Get()
  list(
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('verification') verification?: string,
    @Query('clubRole') clubRole?: string,
    @Query('activity') activity?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.users.listUsers({
      query,
      status,
      category,
      verification,
      clubRole,
      activity,
      createdFrom,
      createdTo,
      sort,
      dir,
      take: toNumber(take),
      skip: toNumber(skip),
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.users.getUserDetail(id);
  }

  @Get(':id/matches')
  matches(
    @Param('id') id: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.users.getUserMatches(id, toNumber(take), toNumber(skip));
  }

  @Get(':id/audit')
  audit(
    @Param('id') id: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.users.getUserAudit(id, toNumber(take), toNumber(skip));
  }

  @Patch(':id/status')
  setStatus(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.users.setUserStatus(req.user.adminId, id, dto.status, dto.reason);
  }

  @Patch(':id/profile')
  updateProfile(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.users.updateUserProfile(req.user.adminId, id, dto);
  }

  @Patch(':id/verification')
  setVerification(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: SetUserVerificationDto,
  ) {
    return this.users.setVerification(
      req.user.adminId,
      id,
      dto.status,
      dto.reason,
    );
  }

  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  requestDeletion(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.users.requestDeletion(req.user.adminId, id, dto.reason);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.users.restoreDeletedUser(req.user.adminId, id, dto.reason);
  }

  @Post(':id/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  revokeSessions(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.users.revokeUserSessions(req.user.adminId, id, dto.reason);
  }

  // Each request emails the user a code; cap it so the console cannot be used
  // to mail-bomb an inbox.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post(':id/password-reset')
  @HttpCode(HttpStatus.OK)
  passwordReset(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.users.sendPasswordReset(req.user.adminId, id, dto.reason);
  }

  @Put(':id/club-memberships/:clubId')
  setClubMembership(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Param('clubId') clubId: string,
    @Body() dto: SetClubMembershipDto,
  ) {
    return this.users.setClubMembership(
      req.user.adminId,
      id,
      clubId,
      { role: dto.role, status: dto.status },
      dto.reason,
    );
  }

  // POST rather than DELETE: the reason travels in the body, which not every
  // HTTP client forwards on DELETE.
  @Post(':id/club-memberships/:clubId/remove')
  @HttpCode(HttpStatus.OK)
  removeClubMembership(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Param('clubId') clubId: string,
    @Body() dto: ReasonDto,
  ) {
    return this.users.removeClubMembership(
      req.user.adminId,
      id,
      clubId,
      dto.reason,
    );
  }

  @Patch(':id/coach-listing')
  setCoachListing(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: SetCoachListingDto,
  ) {
    return this.users.setCoachListing(
      req.user.adminId,
      id,
      dto.suspended,
      dto.reason,
    );
  }
}
