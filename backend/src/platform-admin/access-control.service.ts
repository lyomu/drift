import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { MailerService } from '../mail/mailer.service';
import { PasswordPolicyService } from '../auth/password-policy';

export const PLATFORM_PERMISSION_CATALOG: {
  permission: PlatformPermission;
  module: string;
  description: string;
}[] = [
  {
    permission: PlatformPermission.ACCESS_MANAGE,
    module: 'Access & Control',
    description: 'Manage staff, roles, and the permission matrix.',
  },
  {
    permission: PlatformPermission.USERS_MANAGE,
    module: 'Users',
    description: 'Review and suspend player accounts.',
  },
  {
    permission: PlatformPermission.ANALYTICS_READ,
    module: 'Overview / Analytics',
    description: 'View platform growth, revenue, market, and health reporting.',
  },
  {
    permission: PlatformPermission.VENUES_MANAGE,
    module: 'Venues',
    description:
      'Manage venue data, verification, sync, and duplicate resolution.',
  },
  {
    permission: PlatformPermission.ORGANIZATIONS_MANAGE,
    module: 'Organizations',
    description: 'Manage clubs, approvals, subscriptions, and club moderation.',
  },
  {
    permission: PlatformPermission.COMPETITIONS_MANAGE,
    module: 'Competitions',
    description: 'Manage global competitions, disputes, and rulesets.',
  },
  {
    permission: PlatformPermission.CONTENT_MANAGE,
    module: 'Content',
    description: 'Manage learning content and news publishing.',
  },
  {
    permission: PlatformPermission.COMMERCIAL_MANAGE,
    module: 'Commercial',
    description: 'Manage plans, invoices, promotions, and sponsors.',
  },
  {
    permission: PlatformPermission.TRUST_SAFETY_MANAGE,
    module: 'Trust & Safety',
    description: 'Resolve reports, abuse cases, and escalated moderation.',
  },
  {
    permission: PlatformPermission.PLATFORM_CONFIG_MANAGE,
    module: 'Platform config',
    description:
      'Manage locations, flags, templates, settings, and integrations.',
  },
  {
    permission: PlatformPermission.SUPPORT_MANAGE,
    module: 'Support',
    description: 'Manage support tickets and privacy requests.',
  },
  {
    permission: PlatformPermission.AUDIT_READ,
    module: 'Audit',
    description: 'Read the immutable platform audit trail.',
  },
];

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {}

  permissionCatalog() {
    return { permissions: PLATFORM_PERMISSION_CATALOG };
  }

  async currentAdmin(adminId: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: { select: { permission: true } },
          },
        },
      },
    });
    if (!admin)
      throw new NotFoundException('Platform administrator not found.');
    return {
      ...admin,
      role: {
        id: admin.role.id,
        name: admin.role.name,
        permissions: admin.role.permissions.map((row) => row.permission),
      },
    };
  }

  async listRoles() {
    const roles = await this.prisma.platformRole.findMany({
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { admins: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return {
      roles: roles.map((role) => ({
        ...role,
        permissions: role.permissions.map((row) => row.permission),
      })),
    };
  }

  async createRole(
    actorId: string,
    data: {
      name: string;
      description?: string;
      permissions: PlatformPermission[];
    },
  ) {
    if (!data.permissions.length)
      throw new BadRequestException('Select at least one permission.');
    const role = await this.prisma.platformRole.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        permissions: {
          create: data.permissions.map((permission) => ({ permission })),
        },
      },
      include: { permissions: true },
    });
    await this.audit.record(
      actorId,
      'platform_role.create',
      'PlatformRole',
      role.id,
      {
        name: role.name,
        permissions: data.permissions,
      },
    );
    return role;
  }

  async updateRole(
    actorId: string,
    roleId: string,
    data: {
      name: string;
      description?: string;
      permissions: PlatformPermission[];
    },
  ) {
    const existing = await this.requireRole(roleId);
    if (existing.isSystem) {
      throw new BadRequestException(
        'The protected Super Admin role cannot be edited.',
      );
    }
    if (!data.permissions.length)
      throw new BadRequestException('Select at least one permission.');
    const role = await this.prisma.$transaction(async (tx) => {
      await tx.platformRolePermission.deleteMany({ where: { roleId } });
      return tx.platformRole.update({
        where: { id: roleId },
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          permissions: {
            create: data.permissions.map((permission) => ({ permission })),
          },
        },
        include: { permissions: true },
      });
    });
    await this.audit.record(
      actorId,
      'platform_role.update',
      'PlatformRole',
      roleId,
      {
        previousName: existing.name,
        permissions: data.permissions,
      },
    );
    return role;
  }

  async listTeam() {
    const [admins, invitations] = await Promise.all([
      this.prisma.platformAdmin.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          lastLoginAt: true,
          deactivatedAt: true,
          twoFactorEnabled: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.platformAdminInvitation.findMany({
        where: { acceptedAt: null },
        select: {
          id: true,
          email: true,
          expiresAt: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { admins, invitations };
  }

  async invite(actorId: string, emailInput: string, roleId: string) {
    const email = emailInput.trim().toLowerCase();
    await this.requireRole(roleId);
    const existing = await this.prisma.platformAdmin.findUnique({
      where: { email },
    });
    if (existing)
      throw new BadRequestException(
        'A platform staff account already uses this email.',
      );

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.platformAdminInvitation.deleteMany({
        where: { email, acceptedAt: null },
      });
      await tx.platformAdminInvitation.create({
        data: { email, roleId, invitedById: actorId, tokenHash, expiresAt },
      });
    });
    await this.audit.record(
      actorId,
      'platform_admin.invite',
      'PlatformAdminInvitation',
      email,
      { roleId },
    );

    const base = process.env.PLATFORM_ADMIN_WEB_URL ?? 'http://localhost:3002';
    const inviteUrl = `${base}/accept-invite?token=${token}`;
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[platform-admin] Invite for ${email}: ${inviteUrl}`);
    }
    const sent = await this.mailer.sendPlatformInvitation(
      email,
      inviteUrl,
      expiresAt,
    );
    return {
      invited: true,
      email,
      expiresAt,
      delivery: sent
        ? 'EMAIL'
        : process.env.NODE_ENV === 'production'
          ? 'PENDING_PROVIDER'
          : 'DEV_CONSOLE',
      ...(process.env.NODE_ENV !== 'production'
        ? { devInviteUrl: inviteUrl }
        : {}),
    };
  }

  async acceptInvite(token: string, name: string, password: string) {
    const invitation = await this.prisma.platformAdminInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'This invitation is invalid or has expired.',
      );
    }
    await this.passwordPolicy.assertAcceptable(password);
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await this.prisma.$transaction(async (tx) => {
      const created = await tx.platformAdmin.create({
        data: {
          email: invitation.email,
          name: name.trim(),
          passwordHash,
          roleId: invitation.roleId,
        },
      });
      await tx.platformAdminInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return created;
    });
    await this.audit.record(
      invitation.invitedById,
      'platform_admin.invite.accept',
      'PlatformAdmin',
      admin.id,
      {
        email: admin.email,
      },
    );
    return { accepted: true };
  }

  async updateAdmin(
    actorId: string,
    adminId: string,
    data: { roleId?: string; status?: 'ACTIVE' | 'SUSPENDED' },
  ) {
    const target = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      include: { role: { include: { permissions: true } } },
    });
    if (!target)
      throw new NotFoundException('Platform administrator not found.');
    if (actorId === adminId && data.status === 'SUSPENDED') {
      throw new BadRequestException(
        'You cannot suspend your own staff account.',
      );
    }

    let nextRoleHasAccess = target.role.permissions.some(
      (row) => row.permission === PlatformPermission.ACCESS_MANAGE,
    );
    if (data.roleId) {
      const nextRole = await this.requireRole(data.roleId);
      nextRoleHasAccess = await this.prisma.platformRolePermission
        .count({
          where: {
            roleId: nextRole.id,
            permission: PlatformPermission.ACCESS_MANAGE,
          },
        })
        .then((count) => count > 0);
    }
    const removesLastManager =
      !target.deactivatedAt &&
      target.role.permissions.some(
        (row) => row.permission === PlatformPermission.ACCESS_MANAGE,
      ) &&
      (data.status === 'SUSPENDED' || !nextRoleHasAccess);
    if (removesLastManager) {
      const activeManagers = await this.prisma.platformAdmin.count({
        where: {
          deactivatedAt: null,
          role: {
            permissions: {
              some: { permission: PlatformPermission.ACCESS_MANAGE },
            },
          },
        },
      });
      if (activeManagers <= 1) {
        throw new BadRequestException(
          'At least one active staff member must retain Access & Control permission.',
        );
      }
    }

    const admin = await this.prisma.platformAdmin.update({
      where: { id: adminId },
      data: {
        roleId: data.roleId,
        ...(data.status
          ? { deactivatedAt: data.status === 'SUSPENDED' ? new Date() : null }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        deactivatedAt: true,
        role: { select: { id: true, name: true } },
      },
    });
    await this.audit.record(
      actorId,
      'platform_admin.update',
      'PlatformAdmin',
      adminId,
      data,
    );
    return admin;
  }

  private requireRole(roleId: string) {
    return this.prisma.platformRole
      .findUnique({ where: { id: roleId } })
      .then((role) => {
        if (!role) throw new NotFoundException('Platform role not found.');
        return role;
      });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
