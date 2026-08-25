/**
 * Creates (or re-enables) the first platform admin. There is no self-serve
 * signup for staff — this script is the only entry point, run from the
 * repo with the API's DATABASE_URL loaded:
 *
 *   PLATFORM_ADMIN_EMAIL=you@example.com PLATFORM_ADMIN_PASSWORD=... \
 *     npx ts-node prisma/platform-admin-bootstrap.ts
 *
 * Re-running for an existing email updates the password and clears any
 * deactivation. Further admins are then creatable in-app later if needed.
 */
import 'dotenv/config';
import { PlatformPermission, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const email = process.env.PLATFORM_ADMIN_EMAIL;
const password = process.env.PLATFORM_ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    'Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD before running.',
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error('PLATFORM_ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

async function main() {
  // Prisma 7 driver-adapter setup, matching src/prisma/prisma.service.ts.
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    // Non-null: the guard above exits when either value is missing.
    const passwordHash = await bcrypt.hash(password!, 10);
    const role = await prisma.platformRole.upsert({
      where: { name: 'Super Admin' },
      create: {
        name: 'Super Admin',
        description: 'Protected bootstrap role with full platform access.',
        isSystem: true,
        permissions: {
          create: Object.values(PlatformPermission).map((permission) => ({
            permission,
          })),
        },
      },
      update: {
        permissions: {
          createMany: {
            data: Object.values(PlatformPermission).map((permission) => ({
              permission,
            })),
            skipDuplicates: true,
          },
        },
      },
    });
    const admin = await prisma.platformAdmin.upsert({
      where: { email: email! },
      create: { email: email!, passwordHash, roleId: role.id },
      update: { passwordHash, deactivatedAt: null },
    });
    console.log(`Platform admin ready: ${admin.email} (${admin.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
