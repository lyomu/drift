import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { AccessControlService } from './access-control.service';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { CreatePlatformRoleDto, InvitePlatformAdminDto, UpdatePlatformAdminDto, UpdatePlatformRoleDto } from './dto/access-control.dto';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { PlatformGuard } from './guards/platform.guard';

@Controller('platform-admin/access')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.ACCESS_MANAGE)
export class AccessControlController {
  constructor(private readonly access: AccessControlService) {}

  private actor(req: { user: { adminId: string } }) {
    return req.user.adminId;
  }

  @Get('permissions')
  permissions() {
    return this.access.permissionCatalog();
  }

  @Get('roles')
  roles() {
    return this.access.listRoles();
  }

  @Post('roles')
  createRole(@Req() req: { user: { adminId: string } }, @Body() dto: CreatePlatformRoleDto) {
    return this.access.createRole(this.actor(req), dto);
  }

  @Patch('roles/:id')
  updateRole(@Req() req: { user: { adminId: string } }, @Param('id') id: string, @Body() dto: UpdatePlatformRoleDto) {
    return this.access.updateRole(this.actor(req), id, dto);
  }

  @Get('team')
  team() {
    return this.access.listTeam();
  }

  @Post('team/invitations')
  invite(@Req() req: { user: { adminId: string } }, @Body() dto: InvitePlatformAdminDto) {
    return this.access.invite(this.actor(req), dto.email, dto.roleId);
  }

  @Patch('team/:id')
  updateAdmin(@Req() req: { user: { adminId: string } }, @Param('id') id: string, @Body() dto: UpdatePlatformAdminDto) {
    return this.access.updateAdmin(this.actor(req), id, dto);
  }
}
