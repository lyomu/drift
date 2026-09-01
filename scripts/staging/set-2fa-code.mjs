/**
 * Staging stopgap for Platform Admin 2FA until an email provider is wired up
 * (production responses report delivery: 'PENDING_PROVIDER' and never log the
 * code). Run this AFTER you submit email + password on the /platform login
 * page — it sets a known code on the open challenge so you can get past the
 * verify-2fa screen:
 *
 *   ssh root@135.181.146.130
 *   docker exec -i drift-api node - < /srv/drift/app/scripts/set-2fa-code.mjs
 *   # or choose the code explicitly:
 *   docker exec -i drift-api node - < ... # (code baked into env below)
 *
 * Code can be supplied via the STAGING_2FA_CODE env var on the host:
 *   docker exec -i -e STAGING_2FA_CODE=123456 drift-api node - < this-file
 *
 * Challenges expire 10 minutes after login and die after 5 wrong attempts.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const EMAIL = process.env.STAGING_ADMIN_EMAIL || 'admin@drift.test';
const code =
  process.env.STAGING_2FA_CODE ||
  String(Math.floor(100000 + Math.random() * 900000));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const admin = await prisma.platformAdmin.findUnique({ where: { email: EMAIL } });
  if (!admin || admin.deactivatedAt) {
    console.error(`No active platform admin for ${EMAIL}.`);
    process.exit(1);
  }
  const challenge = await prisma.platformAdminTwoFactorChallenge.findFirst({
    where: {
      adminId: admin.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!challenge) {
    console.error(
      `No open 2FA challenge for ${EMAIL}. Submit the login form first, then run this script.`,
    );
    process.exit(1);
  }
  await prisma.platformAdminTwoFactorChallenge.update({
    where: { id: challenge.id },
    data: { codeHash: await bcrypt.hash(code, 8), attempts: 0 },
  });
  console.log(`2FA code for ${EMAIL}: ${code}`);
  console.log('Enter it on the verify-2fa page before the challenge expires.');
} finally {
  await prisma.$disconnect();
}
