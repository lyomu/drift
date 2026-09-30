import { Prisma } from '@prisma/client';

export const applicationInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      accountStatus: true,
      onboardingStep: true,
    },
  },
} satisfies Prisma.CoachApplicationInclude;

export type ApplicationRecord = Prisma.CoachApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

/** The coach's own view: their draft plus where it stands in review. */
export function toApplicationDetail(application: ApplicationRecord) {
  return {
    id: application.id,
    status: application.status,
    bio: application.bio,
    qualifications: application.qualifications,
    yearsExperience: application.yearsExperience,
    specialisations: application.specialisations,
    levels: application.levels,
    availabilityNote: application.availabilityNote,
    publicContact: {
      email: application.publicEmail,
      phone: application.publicPhone,
      bookingUrl: application.bookingUrl,
    },
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
    // The reviewer's note, shown verbatim so a CHANGES_REQUESTED application
    // tells the coach what to fix. The reviewer's identity is deliberately
    // not exposed to the coach.
    decisionReason: application.decisionReason,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

/** The reviewer's view: adds who is applying and the audit trail. */
export function toApplicationAdminSummary(application: ApplicationRecord) {
  return {
    id: application.id,
    status: application.status,
    userId: application.userId,
    accountEmail: application.user.email,
    firstName: application.user.firstName,
    lastName: application.user.lastName,
    photoUrl: application.user.photoUrl,
    yearsExperience: application.yearsExperience,
    specialisations: application.specialisations,
    levels: application.levels,
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
    createdAt: application.createdAt,
  };
}

export function toApplicationAdminDetail(
  application: ApplicationRecord,
  events: {
    id: string;
    previousStatus: string | null;
    nextStatus: string;
    note: string | null;
    actorUserId: string | null;
    actorAdminId: string | null;
    createdAt: Date;
  }[],
) {
  return {
    ...toApplicationAdminSummary(application),
    bio: application.bio,
    qualifications: application.qualifications,
    availabilityNote: application.availabilityNote,
    publicContact: {
      email: application.publicEmail,
      phone: application.publicPhone,
      bookingUrl: application.bookingUrl,
    },
    decisionReason: application.decisionReason,
    reviewedById: application.reviewedById,
    accountStatus: application.user.accountStatus,
    onboardingStep: application.user.onboardingStep,
    history: events,
  };
}
