// One-off seed: mark every sovereign country as an ACTIVE supported market,
// using its capital plus two other well-known cities.
// Run with: npx ts-node prisma/seed-markets.ts
import { PrismaClient } from '@prisma/client';
import { MARKET_SEED_DATA } from './seed-markets-data';

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  let updated = 0;

  for (const entry of MARKET_SEED_DATA) {
    const result = await prisma.supportedMarket.upsert({
      where: {
        countryCode_cityName: {
          countryCode: entry.countryCode,
          cityName: entry.cityName,
        },
      },
      create: {
        countryCode: entry.countryCode,
        countryName: entry.countryName,
        cityName: entry.cityName,
        timezone: entry.timezone,
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
        countryName: entry.countryName,
        timezone: entry.timezone,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(
    `Markets seeded: ${created} created, ${updated} updated, ${MARKET_SEED_DATA.length} total.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
