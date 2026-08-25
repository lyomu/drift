import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformPermission } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PLATFORM_PERMISSIONS_KEY } from '../decorators/require-platform-permission.decorator';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PlatformPermission[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: { adminId: string } }>();
    const adminId = request.user?.adminId;
    if (!adminId) throw new ForbiddenException('Platform permission could not be verified.');

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: { role: { select: { permissions: { select: { permission: true } } } } },
    });
    const granted = new Set(admin?.role.permissions.map((row) => row.permission) ?? []);
    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException('Your platform role does not permit this action.');
    }
    return true;
  }
}
