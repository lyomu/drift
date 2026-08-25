/**
 * Wave 7 — imports tennis court venues from OpenStreetMap via the Overpass
 * API. Free, no API key. Creates UNVERIFIED courts; a platform admin can
 * verify them later.
 *
 *   npx ts-node prisma/import-osm-courts.ts [lat] [lng] [radiusMeters]
 *
 * Defaults to London (51.5074, -0.1278) with a 15 km radius.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const lat = parseFloat(process.argv[2] ?? '51.5074');
const lng = parseFloat(process.argv[3] ?? '-0.1278');
const radius = parseInt(process.argv[4] ?? '15000', 10);

const query = `[out:json][timeout:30];
(
  node["leisure"="pitch"]["sport"="tennis"](around:${radius},${lat},${lng});
  way["leisure"="pitch"]["sport"="tennis"](around:${radius},${lat},${lng});
);
out center tags;`;

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
  );
  if (!res.ok) {
    console.error(`Overpass returned ${res.status}`);
    process.exit(1);
  }
  const data = (await res.json()) as {
    elements: {
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }[];
  };

  let created = 0;
  let skipped = 0;
  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const name = tags.name ?? `Tennis court (${el.id})`;
    const latitude = el.lat ?? el.center?.lat;
    const longitude = el.lon ?? el.center?.lon;

    // Dedup by proximity (< 50 m) + same name.
    const dup = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM courts WHERE name = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL AND (6371000 * acos(least(1, greatest(-1, sin(radians($2)) * sin(radians(latitude)) + cos(radians($2)) * cos(radians(latitude)) * cos(radians(longitude) - radians($3)))))) < 50 LIMIT 1`,
      name, latitude, longitude,
    );
    if (Array.isArray(dup) && dup.length > 0) { skipped++; continue; }

    const surface = tags.surface === 'clay' ? 'CLAY' : tags.surface === 'grass' ? 'GRASS' : 'HARD';
    const indoor = tags.indoor === 'yes';

    const court = await prisma.court.create({
      data: {
        name,
        address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || null,
        latitude,
        longitude,
        verificationStatus: 'UNVERIFIED',
        courtGroups: {
          create: {
            sport: 'TENNIS',
            surface,
            indoor,
            lighting: tags.light === 'yes' || tags.floodlit === 'yes',
            count: 1,
          },
        },
      },
    });
    created++;
    console.log(`  + ${court.name} (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)})`);
  }

  console.log(`\nOSM import: ${created} created, ${skipped} deduped.`);
  await prisma.$disconnect();
}

void main();
