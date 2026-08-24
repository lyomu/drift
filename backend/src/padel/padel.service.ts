import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { padelProfileInclude, toPadelProfileDto } from './padel.mapper';
import { UpdatePadelPreferencesDto } from './dto/update-padel-preferences.dto';

@Injectable()
export class PadelService {
  constructor(private readonly prisma: PrismaService) {}

  /** "+ Add Padel" confirm-intent — idempotent, so re-tapping does nothing. */
  async addPadel(userId: string) {
    const existing = await this.prisma.padelProfile.findUnique({
      where: { userId },
      include: padelProfileInclude,
    });
    if (existing) {
      return toPadelProfileDto(existing);
    }

    const created = await this.prisma.padelProfile.create({
      data: { userId },
      include: padelProfileInclude,
    });
    return toPadelProfileDto(created);
  }

  /** 404 when Padel hasn't been added — My Sports Hub uses this to decide
   * whether to show "Open Padel Profile" or "+ Add Padel". */
  async getProfile(userId: string) {
    const profile = await this.prisma.padelProfile.findUnique({
      where: { userId },
      include: padelProfileInclude,
    });
    if (!profile) {
      throw new NotFoundException('Padel profile not added yet.');
    }
    return toPadelProfileDto(profile);
  }

  async updatePreferences(userId: string, dto: UpdatePadelPreferencesDto) {
    const existing = await this.prisma.padelProfile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException('Padel profile not added yet.');
    }

    await this.prisma.padelProfile.update({
      where: { userId },
      data: {
        preferredSide: dto.preferredSide,
        partnerPreference: dto.partnerPreference,
        goals: dto.goals,
      },
    });
    return this.getProfile(userId);
  }
}
