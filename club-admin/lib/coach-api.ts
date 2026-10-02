import { api } from "./api-client";
import type {
  CoachAdmin,
  CoachApplication,
  CoachClub,
  CoachLevel,
} from "./types";

/**
 * The coach workspace's own calls. Two surfaces on purpose:
 *
 * - `/coach-applications/me` is the draft under review. Editing it never
 *   touches the live listing.
 * - `/coaches/me` is the approved, public profile. It only exists after a
 *   reviewer approves the application, and edits there take effect at once.
 */
export type CoachFieldsPayload = {
  bio: string | null;
  qualifications: string[];
  yearsExperience: number | null;
  specialisations: string[];
  levels: CoachLevel[];
  availabilityNote: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  bookingUrl: string | null;
};

export const coachApi = {
  getApplication: () =>
    api.get<{ application: CoachApplication | null }>("/coach-applications/me"),

  saveApplication: (payload: CoachFieldsPayload) =>
    api.patch<{ application: CoachApplication }>(
      "/coach-applications/me",
      payload,
    ),

  submitApplication: () =>
    api.post<{ application: CoachApplication }>("/coach-applications/me/submit"),

  getProfile: () => api.get<CoachAdmin>("/coaches/me"),

  updateProfile: (payload: CoachFieldsPayload) =>
    api.patch<CoachAdmin>("/coaches/me", payload),

  myClubs: () => api.get<{ clubs: CoachClub[] }>("/coaches/me/clubs"),

  /** A coach's photo is their account photo — same endpoint the mobile
   * app's "edit my profile" screen uses. */
  uploadMyPhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<{ photoUrl: string | null }>("/users/me/photo", form);
  },
  deleteMyPhoto: () => api.delete<{ photoUrl: string | null }>("/users/me/photo"),

  /** Club admin setting a coach's photo on their behalf. */
  uploadCoachPhoto: (clubId: string, coachId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<CoachAdmin>(
      `/clubs/${clubId}/coaches/${coachId}/photo`,
      form,
    );
  },
  deleteCoachPhoto: (clubId: string, coachId: string) =>
    api.delete<CoachAdmin>(`/clubs/${clubId}/coaches/${coachId}/photo`),
};

/** Copy for each application state, kept in one place so the status card, the
 *  form banner and the sidebar never describe the same state differently. */
export const APPLICATION_COPY: Record<
  CoachApplication["status"],
  { label: string; blurb: string }
> = {
  DRAFT: {
    label: "Draft",
    blurb:
      "Your application has not been sent yet. Finish the details and submit it for review.",
  },
  PENDING_REVIEW: {
    label: "In review",
    blurb:
      "Our team is reviewing your application. You will be able to edit it again once they respond.",
  },
  CHANGES_REQUESTED: {
    label: "Changes requested",
    blurb:
      "A reviewer needs more from you before your profile can go live. Update your details and resubmit.",
  },
  APPROVED: {
    label: "Approved",
    blurb:
      "Your profile is live. Players can find you in the Drift app under Coaches.",
  },
  REJECTED: {
    label: "Not approved",
    blurb:
      "This application was not approved. You can update your details and submit it again.",
  },
};
