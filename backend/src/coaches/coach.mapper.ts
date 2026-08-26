import { Prisma } from '@prisma/client';

export const coachInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      accountStatus: true,
    },
  },
  affiliations: {
    include: {
      club: { select: { id: true, name: true } },
    },
    orderBy: { club: { name: 'asc' as const } },
  },
} satisfies Prisma.CoachProfileInclude;

export type CoachRecord = Prisma.CoachProfileGetPayload<{
  include: typeof coachInclude;
}>;

export function toCoachSummary(coach: CoachRecord) {
  return {
    id: coach.id,
    userId: coach.userId,
    firstName: coach.user.firstName,
    lastName: coach.user.lastName,
    photoUrl: coach.user.photoUrl,
    bio: coach.bio,
    yearsExperience: coach.yearsExperience,
    specialisations: coach.specialisations,
    levels: coach.levels,
    verificationStatus: coach.verificationStatus,
    clubs: coach.affiliations.map((row) => row.club),
  };
}

export function toCoachDetail(coach: CoachRecord) {
  return {
    ...toCoachSummary(coach),
    qualifications: coach.qualifications,
    availabilityNote: coach.availabilityNote,
    publicContact: {
      email: coach.publicEmail,
      phone: coach.publicPhone,
      bookingUrl: coach.bookingUrl,
    },
  };
}

export function toCoachAdminDetail(coach: CoachRecord) {
  return {
    ...toCoachDetail(coach),
    accountEmail: coach.user.email,
  };
}
