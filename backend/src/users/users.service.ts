import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  PrivacyRequestStatus,
  PrivacyRequestType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';
import {
  ERASURE_RETENTION_DAYS,
  ErasureService,
} from '../privacy/erasure.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /** Edit Profile — a post-onboarding partial update, distinct from the
   * onboarding-step BasicProfileDto flow. */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.$transaction(async (tx) => {
      if (
        dto.firstName !== undefined ||
        dto.lastName !== undefined ||
        dto.bio !== undefined
      ) {
        await tx.user.update({
          where: { id: userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            bio: dto.bio,
          },
        });
      }
      if (dto.dominantHand !== undefined) {
        await tx.tennisProfile.update({
          where: { userId },
          data: { dominantHand: dto.dominantHand },
        });
      }
    });
    return this.findById(userId);
  }

  async getPrivacySettings(userId: string) {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
      select: { skillBreakdownVisibility: true, availabilityVisibility: true },
    });
    if (!profile) {
      throw new NotFoundException('Tennis profile not found.');
    }
    return profile;
  }

  async updatePrivacySettings(userId: string, dto: UpdatePrivacySettingsDto) {
    const profile = await this.prisma.tennisProfile.update({
      where: { userId },
      data: {
        skillBreakdownVisibility: dto.skillBreakdownVisibility,
        availabilityVisibility: dto.availabilityVisibility,
      },
      select: { skillBreakdownVisibility: true, availabilityVisibility: true },
    });
    return profile;
  }

  /**
   * Soft delete only — sets accountStatus and revokes active refresh
   * tokens so `login()`'s DELETED check and existing sessions both take
   * effect immediately. No cascading data purge this phase (a genuinely
   * separate GDPR-shaped project, documented in PROGRESS.md).
   */
  /**
   * Deactivates immediately and files a DELETION privacy request, which the
   * scheduled job carries out after the retention window (owner decision
   * P.3a). Previously this set a flag and nothing else — the person's erasure
   * request existed only in their head, with no record, no audit trail and no
   * clock running.
   *
   * The window is staff-recoverable, not self-service: `AuthService.login`
   * refuses a DELETED account, so cancelling means staff clearing the status
   * and the pending request.
   *
   * Idempotent — a second call reuses the pending request rather than filing
   * a duplicate and silently restarting the 30-day clock.
   */
  async deleteAccount(userId: string) {
    const existing = await this.prisma.privacyRequest.findFirst({
      where: {
        userId,
        type: PrivacyRequestType.DELETION,
        status: PrivacyRequestStatus.PENDING,
      },
      select: { id: true, createdAt: true },
    });

    const request = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.DELETED },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (existing) return existing;
      return tx.privacyRequest.create({
        data: {
          userId,
          type: PrivacyRequestType.DELETION,
          status: PrivacyRequestStatus.PENDING,
          requestNote:
            'Account deletion requested by the account holder in the app.',
        },
        select: { id: true, createdAt: true },
      });
    });

    return {
      deleted: true,
      erasureScheduledFor: ErasureService.dueAt(request.createdAt).toISOString(),
      retentionDays: ERASURE_RETENTION_DAYS,
    };
  }
}
