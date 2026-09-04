import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';

/** Days a deactivated account is retained before erasure runs (owner decision
 * P.3a, 2026-09-03). Erasure is irreversible, so the window exists to make a
 * mis-tap recoverable — by staff, since login already refuses a DELETED
 * account and the person cannot sign back in to cancel. */
export const ERASURE_RETENTION_DAYS = 30;

/** Replaces free text rather than nulling it, so a redacted row stays
 * distinguishable from one that was simply always empty. */
export function redactionMarker(requestId: string): string {
  return `privacy-request-redacted:${requestId}`;
}

/**
 * The single definition of what erasure removes.
 *
 * Anonymisation, not deletion, and deliberately so: this is a multi-party
 * product, and hard-deleting a player would corrupt the match history,
 * standings and conversations of people who never asked to be erased. The row
 * and its relations survive; everything that identifies the person does not.
 *
 * A consequence worth stating, because it is easy to assume otherwise:
 * **`onDelete: Cascade` never fires here.** Erasure is an UPDATE. Anything that
 * must go has to be listed explicitly below.
 *
 * Both entry points — a staff-fulfilled privacy request and the 30-day job —
 * call this. Defining the set twice is precisely how a field gets added to one
 * path and forgotten in the other.
 */
@Injectable()
export class ErasureService {
  private readonly logger = new Logger(ErasureService.name);

  async eraseUser(
    tx: Prisma.TransactionClient,
    userId: string,
    requestId: string,
  ): Promise<void> {
    const marker = redactionMarker(requestId);
    const now = new Date();

    // ---- direct identity -------------------------------------------------
    await tx.user.update({
      where: { id: userId },
      data: {
        email: null,
        phone: null,
        // Not null: passwordHash is non-nullable-by-intent for password
        // accounts, and a marker also guarantees no bcrypt compare can match.
        passwordHash: marker,
        firstName: null,
        lastName: null,
        photoUrl: null,
        bio: null,
        accountStatus: AccountStatus.DELETED,
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
      },
    });

    // The avatar bytes, not just the reference to them. `photoUrl` is nulled
    // on the row above, but the image lives in `user_photo_assets`, and that
    // table's `onDelete: Cascade` never fires because erasure is an UPDATE —
    // exactly the case the header comment warns about. A face is as personal
    // as the data here gets.
    await tx.userPhotoAsset.deleteMany({ where: { userId } });

    // ---- credentials and reachability ------------------------------------
    // Deleted outright, not anonymised: a social login must stop working, and
    // a push token has no anonymised form — it is an address. Leaving either
    // behind means an "erased" account that can still be signed into or
    // still receives notifications.
    await tx.socialIdentity.deleteMany({ where: { userId } });
    await tx.deviceToken.deleteMany({ where: { userId } });
    await tx.verificationCode.deleteMany({ where: { userId } });
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });

    // ---- profiles --------------------------------------------------------
    await tx.tennisProfile.updateMany({
      where: { userId },
      data: {
        generalLocation: null,
        latitude: null,
        longitude: null,
        locationSource: null,
        preferredClubName: null,
        preferredCourtNames: [],
      },
    });
    // Padel was previously missed while tennis was cleared — an inconsistency
    // rather than a decision.
    await tx.padelProfile.updateMany({
      where: { userId },
      data: { partnerPreference: null, goals: [] },
    });
    // A coach profile is public-facing and carries direct contact details.
    await tx.coachProfile.updateMany({
      where: { userId },
      data: {
        bio: null,
        publicEmail: null,
        publicPhone: null,
        availabilityNote: null,
        bookingUrl: null,
        qualifications: [],
        specialisations: [],
      },
    });
    await tx.availabilitySlot.deleteMany({
      where: { tennisProfile: { is: { userId } } },
    });

    // ---- free text the person authored -----------------------------------
    // Bodies are redacted but rows are kept: the other participant's
    // conversation would otherwise lose its shape (owner decision P.3b).
    await tx.message.updateMany({
      where: { senderId: userId },
      data: { body: marker },
    });
    await tx.matchReflection.updateMany({
      where: { userId },
      data: { notes: null },
    });
    await tx.supportTicket.updateMany({
      where: { userId },
      data: { subject: marker, body: marker },
    });
    // Only reports they wrote. Reports *about* them belong to the reporter and
    // to the safety record, and are not the erased person's to remove.
    await tx.playerReport.updateMany({
      where: { reporterId: userId },
      data: { notes: null },
    });

    // ---- behavioural history --------------------------------------------
    // Their own inbox and reading history. Notification titles and bodies
    // routinely embed the person's own name.
    await tx.notification.deleteMany({ where: { userId } });
    await tx.savedStory.deleteMany({ where: { userId } });
    await tx.dismissedHomeCard.deleteMany({ where: { userId } });
    await tx.clubPostReaction.deleteMany({ where: { userId } });

    this.logger.log(`Erased user ${userId} for privacy request ${requestId}`);
  }

  /** The moment a request filed now becomes due for automatic erasure. */
  static dueAt(from: Date): Date {
    const due = new Date(from);
    due.setUTCDate(due.getUTCDate() + ERASURE_RETENTION_DAYS);
    return due;
  }
}
