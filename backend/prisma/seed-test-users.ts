import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { DominantHand, OnboardingStep, PrismaClient, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://drift:drift@localhost:5432/drift_tennis' }),
});

export const DEFAULT_PASSWORD = 'Password123!';

export const TEST_USERS = [
  {
    email: 'alex.player@drifttennis.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Alex',
    lastName: 'Morgan',
    onboardingStep: OnboardingStep.COMPLETE,
    verificationStatus: VerificationStatus.VERIFIED,
    bio: 'Intermediate tennis player looking for friendly match play and rally partners.',
    dominantHand: DominantHand.RIGHT,
    singlesRating: 4.0,
    doublesRating: 4.0,
  },
  {
    email: 'sarah.tennis@drifttennis.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Sarah',
    lastName: 'Connor',
    onboardingStep: OnboardingStep.COMPLETE,
    verificationStatus: VerificationStatus.VERIFIED,
    bio: 'Advanced competitive singles and doubles player.',
    dominantHand: DominantHand.RIGHT,
    singlesRating: 4.5,
    doublesRating: 4.5,
  },
  {
    email: 'jordan.newbie@drifttennis.com',
    password: DEFAULT_PASSWORD,
    firstName: 'Jordan',
    lastName: 'Lee',
    onboardingStep: OnboardingStep.BASIC_PROFILE,
    verificationStatus: VerificationStatus.VERIFIED,
    bio: 'Beginner player exploring clubs and coaching sessions.',
    dominantHand: DominantHand.LEFT,
    singlesRating: 2.5,
    doublesRating: 2.5,
  },
];

async function seedTestUsers() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const u of TEST_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: {
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          onboardingStep: u.onboardingStep,
          verificationStatus: u.verificationStatus,
          bio: u.bio,
          emailVerifiedAt: new Date(),
          onboardingCompletedAt: u.onboardingStep === OnboardingStep.COMPLETE ? new Date() : null,
        },
      });
      console.log(`Updated test user: ${u.email}`);
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          onboardingStep: u.onboardingStep,
          verificationStatus: u.verificationStatus,
          bio: u.bio,
          emailVerifiedAt: new Date(),
          onboardingCompletedAt: u.onboardingStep === OnboardingStep.COMPLETE ? new Date() : null,
          tennisProfile: {
            create: {
              dominantHand: u.dominantHand,
              singlesRating: u.singlesRating,
              doublesRating: u.doublesRating,
            },
          },
        },
      });
      console.log(`Created test user: ${u.email}`);
    }
  }

  const all = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      onboardingStep: true,
    },
  });
  console.log('\nAll Users in DB:');
  console.log(JSON.stringify(all, null, 2));
}

if (require.main === module) {
  seedTestUsers()
    .catch((e) => {
      console.error('Error seeding test users:', e);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
