import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const email = 'coach@drifttennis.com';
const password = 'CoachDemo2026!';
const clubName = 'Riverside Tennis Club';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  const club = await prisma.club.findFirstOrThrow({ where: { name: clubName } });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: 'Maya',
      lastName: 'Okafor',
      bio: 'Tennis coach focused on confident fundamentals, movement, and match play.',
      accountStatus: 'ACTIVE',
      onboardingStep: 'COMPLETE',
      onboardingCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      firstName: 'Maya',
      lastName: 'Okafor',
      bio: 'Tennis coach focused on confident fundamentals, movement, and match play.',
      accountStatus: 'ACTIVE',
      onboardingStep: 'COMPLETE',
      onboardingCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });

  const coach = await prisma.coachProfile.upsert({
    where: { userId: user.id },
    update: {
      bio: 'Tennis coach focused on confident fundamentals, movement, and match play.',
      qualifications: ['PTR Certified', 'Safeguarding certified'],
      yearsExperience: 8,
      specialisations: ['Beginner development', 'Footwork', 'Match preparation'],
      levels: ['BEGINNER', 'INTERMEDIATE'],
      availabilityNote: 'Weekday evenings and Saturday mornings.',
      publicEmail: email,
      publicPhone: '+254 700 111 222',
      bookingUrl: 'https://cal.com/drift/maya-okafor',
      verificationStatus: 'VERIFIED',
    },
    create: {
      userId: user.id,
      bio: 'Tennis coach focused on confident fundamentals, movement, and match play.',
      qualifications: ['PTR Certified', 'Safeguarding certified'],
      yearsExperience: 8,
      specialisations: ['Beginner development', 'Footwork', 'Match preparation'],
      levels: ['BEGINNER', 'INTERMEDIATE'],
      availabilityNote: 'Weekday evenings and Saturday mornings.',
      publicEmail: email,
      publicPhone: '+254 700 111 222',
      bookingUrl: 'https://cal.com/drift/maya-okafor',
      verificationStatus: 'VERIFIED',
    },
  });

  await prisma.coachClubAffiliation.upsert({
    where: { coachProfileId_clubId: { coachProfileId: coach.id, clubId: club.id } },
    update: {},
    create: { coachProfileId: coach.id, clubId: club.id },
  });

  await prisma.coachApplication.upsert({
    where: { userId: user.id },
    update: {
      status: 'APPROVED',
      bio: coach.bio,
      qualifications: coach.qualifications,
      yearsExperience: coach.yearsExperience,
      specialisations: coach.specialisations,
      levels: coach.levels,
      availabilityNote: coach.availabilityNote,
      publicEmail: coach.publicEmail,
      publicPhone: coach.publicPhone,
      bookingUrl: coach.bookingUrl,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      decisionReason: 'Demo coach account approved for local testing.',
    },
    create: {
      userId: user.id,
      status: 'APPROVED',
      bio: coach.bio,
      qualifications: coach.qualifications,
      yearsExperience: coach.yearsExperience,
      specialisations: coach.specialisations,
      levels: coach.levels,
      availabilityNote: coach.availabilityNote,
      publicEmail: coach.publicEmail,
      publicPhone: coach.publicPhone,
      bookingUrl: coach.bookingUrl,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      decisionReason: 'Demo coach account approved for local testing.',
    },
  });

  console.log(JSON.stringify({
    email,
    password,
    coachId: coach.id,
    club: club.name,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
