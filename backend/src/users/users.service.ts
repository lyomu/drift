import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';

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
  async deleteAccount(userId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.DELETED },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { deleted: true };
  }
}
