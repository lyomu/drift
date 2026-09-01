/**
 * Staging bootstrap: creates the two test accounts used to smoke-test the
 * deployed consoles on 135.181.146.130 (see docs/DEPLOYMENT.md).
 *
 * Run INSIDE the api container (it has node_modules + DATABASE_URL):
 *
 *   ssh root@135.181.146.130
 *   docker exec -i drift-api node - < /srv/drift/app/scripts/bootstrap-accounts.mjs
 *
 * Idempotent: re-running updates the passwords and leaves everything else
 * intact. Mirrors backend/scripts/seed-club-owner.mjs and
 * backend/prisma/platform-admin-bootstrap.ts exactly.
 */
import { PrismaClient, PlatformPermission } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const CLUB_EMAIL = 'owner@drift.test';
const CLUB_PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@drift.test';
const ADMIN_PASSWORD = 'DriftPlatform2026!';
const CLUB_NAME = 'Riverside Tennis Club';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  // ------------------------------------------------ club admin (console at /)
  const passwordHash = await bcrypt.hash(CLUB_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: CLUB_EMAIL },
    update: { passwordHash, accountStatus: 'ACTIVE' },
    create: {
      email: CLUB_EMAIL,
      passwordHash,
      firstName: 'Riverside',
      lastName: 'Owner',
      emailVerifiedAt: new Date(),
      onboardingStep: 'COMPLETE',
      onboardingCompletedAt: new Date(),
    },
  });

  let club = await prisma.club.findFirst({ where: { name: CLUB_NAME } });
  if (!club) {
    club = await prisma.club.create({
      data: {
        name: CLUB_NAME,
        description:
          'A friendly club with 6 outdoor hard courts and a full winter program.',
        address: '14 Riverside Drive',
        phone: '+254 700 000 000',
        website: 'riversidetennis.club',
        sports: ['TENNIS'],
        openingHoursNote: 'Open daily, 6am–9pm',
        setupCompletedAt: new Date(),
      },
    });
  } else if (!club.setupCompletedAt) {
    club = await prisma.club.update({
      where: { id: club.id },
      data: { setupCompletedAt: new Date() },
    });
  }

  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: club.id, userId: user.id } },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: { clubId: club.id, userId: user.id, role: 'OWNER', status: 'ACTIVE' },
  });

  // --------------------------------------------- platform admin (console at /platform)
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
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
  await prisma.platformAdmin.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, passwordHash: adminHash, roleId: role.id },
    update: { passwordHash: adminHash, deactivatedAt: null },
  });

  console.log('Staging accounts ready:');
  console.log(`  Club Admin:     ${CLUB_EMAIL} / ${CLUB_PASSWORD}  (${CLUB_NAME})`);
  console.log(`  Platform Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('Platform Admin note: login always issues a 2FA challenge and');
  console.log('production has no email provider yet — use set-2fa-code.mjs');
  console.log('to set a known code on the open challenge after logging in.');
} finally {
  await prisma.$disconnect();
}
