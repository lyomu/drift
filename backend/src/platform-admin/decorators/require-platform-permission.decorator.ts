import { SetMetadata } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';

export const PLATFORM_PERMISSIONS_KEY = 'platformPermissions';

export const RequirePlatformPermission = (
  ...permissions: PlatformPermission[]
) => SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);
