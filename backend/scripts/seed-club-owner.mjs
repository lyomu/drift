/**
 * Minimal club-admin bootstrap for a freshly reset DB.
 *
 * The base `npm run seed` creates no user accounts, self-serve club
 * creation was replaced by a request/approval flow, and
 * `seed-demo-content.mjs` only *logs in* as owner@drift.test. This script
 * writes the account + club + OWNER membership directly (skipping the
 * request/approval + magic-link setup flow) so you can log straight into
 * the club-admin console.
 *
 * Prereqs: DB reachable via backend/.env DATABASE_URL. Backend does NOT
 *          need to be running.
 * Run:     node scripts/seed-club-owner.mjs   (from backend/)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const EMAIL = 'owner@drift.test';
const PASSWORD = 'Password123!';
const CLUB_NAME = 'Riverside Tennis Club';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, accountStatus: 'ACTIVE' },
    create: {
      email: EMAIL,
      passwordHash,
      firstName: 'Riverside',
      lastName: 'Owner',
      emailVerifiedAt: new Date(),
      onboardingStep: 'COMPLETE',
      onboardingCompletedAt: new Date(),
    },
  });
  console.log(`user ${EMAIL} (${user.id})`);

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
    console.log(`created club "${CLUB_NAME}" (${club.id})`);
  } else {
    if (!club.setupCompletedAt) {
      await prisma.club.update({
        where: { id: club.id },
        data: { setupCompletedAt: new Date() },
      });
    }
    console.log(`club "${CLUB_NAME}" already exists (${club.id})`);
  }

  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: club.id, userId: user.id } },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: {
      clubId: club.id,
      userId: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.log('\n----------------------------------------');
  console.log('Club Admin:  ' + EMAIL + ' / ' + PASSWORD);
  console.log('             http://localhost:3010');
  console.log('----------------------------------------');
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
