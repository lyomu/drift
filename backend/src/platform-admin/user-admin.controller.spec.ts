import { PlatformPermission } from '@prisma/client';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PLATFORM_PERMISSIONS_KEY } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { UserAdminController } from './user-admin.controller';
import {
  ReasonDto,
  SetClubMembershipDto,
  SetCoachListingDto,
  SetUserStatusDto,
} from './dto/user-admin.dto';

describe('UserAdminController access control', () => {
  it('guards every route with platform auth + USERS_MANAGE (class level)', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      UserAdminController,
    ) as unknown[];
    expect(guards).toEqual([PlatformGuard, PlatformPermissionGuard]);
    expect(
      Reflect.getMetadata(PLATFORM_PERMISSIONS_KEY, UserAdminController),
    ).toEqual([PlatformPermission.USERS_MANAGE]);
  });

  it('does not let any handler opt out of the class-level permission', () => {
    const proto = UserAdminController.prototype;
    const handlers = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor',
    );
    expect(handlers.length).toBeGreaterThan(10);
    for (const name of handlers) {
      const override = Reflect.getMetadata(
        PLATFORM_PERMISSIONS_KEY,
        proto[name as keyof typeof proto] as object,
      ) as PlatformPermission[] | undefined;
      // Either inherits the class permission or restates USERS_MANAGE.
      if (override) {
        expect(override).toContain(PlatformPermission.USERS_MANAGE);
      }
    }
  });
});

describe('sensitive-action DTO validation', () => {
  const errorsFor = async <T extends object>(cls: new () => T, body: object) =>
    validate(plainToInstance(cls, body));

  it('rejects a missing, blank or too-short reason', async () => {
    for (const reason of [undefined, '', '         ', 'too short']) {
      expect(
        (await errorsFor(ReasonDto, { reason })).length,
      ).toBeGreaterThan(0);
    }
  });

  it('accepts a real reason', async () => {
    expect(
      await errorsFor(ReasonDto, { reason: 'Verified duplicate account' }),
    ).toHaveLength(0);
  });

  it('only accepts ACTIVE/SUSPENDED for status changes (DELETED is not settable here)', async () => {
    const base = { reason: 'Verified duplicate account' };
    expect(
      await errorsFor(SetUserStatusDto, { ...base, status: 'SUSPENDED' }),
    ).toHaveLength(0);
    expect(
      (await errorsFor(SetUserStatusDto, { ...base, status: 'DELETED' }))
        .length,
    ).toBeGreaterThan(0);
  });

  it('validates club role/status enums and the coach listing flag', async () => {
    const base = { reason: 'Verified duplicate account' };
    expect(
      (await errorsFor(SetClubMembershipDto, { ...base, role: 'SUPERADMIN' }))
        .length,
    ).toBeGreaterThan(0);
    expect(
      await errorsFor(SetClubMembershipDto, {
        ...base,
        role: 'COACH',
        status: 'ACTIVE',
      }),
    ).toHaveLength(0);
    expect(
      (await errorsFor(SetCoachListingDto, { ...base, suspended: 'yes' }))
        .length,
    ).toBeGreaterThan(0);
  });
});
