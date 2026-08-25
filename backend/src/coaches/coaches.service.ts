import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, OnboardingStep, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { blockBetween } from '../common/relationship.util';
import { CreateCoachDto, UpdateCoachDto } from './dto/coach-admin.dto';
import { SearchCoachesDto } from './dto/search-coaches.dto';
import {
  coachInclude,
  toCoachAdminDetail,
  toCoachDetail,
  toCoachSummary,
} from './coach.mapper';

const DEFAULT_TAKE = 20;
type CoachFields = CreateCoachDto | UpdateCoachDto;

@Injectable()
export class CoachesService {
  constructor(private readonly prisma: PrismaService) {}

  private cleanText(value: string | null | undefined) {
    if (value === undefined) return undefined;
    const cleaned = value?.trim() ?? '';
    return cleaned.length > 0 ? cleaned : null;
  }

  private cleanList(value: string[] | undefined) {
    if (value === undefined) return undefined;
    return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  }

  private updateData(dto: CoachFields): Prisma.CoachProfileUpdateInput {
    return {
      ...(dto.bio !== undefined ? { bio: this.cleanText(dto.bio) } : {}),
      ...(dto.qualifications !== undefined
        ? { qualifications: this.cleanList(dto.qualifications) }
        : {}),
      ...(dto.yearsExperience !== undefined
        ? { yearsExperience: dto.yearsExperience }
        : {}),
      ...(dto.specialisations !== undefined
        ? { specialisations: this.cleanList(dto.specialisations) }
        : {}),
      ...(dto.levels !== undefined ? { levels: dto.levels } : {}),
      ...(dto.availabilityNote !== undefined
        ? { availabilityNote: this.cleanText(dto.availabilityNote) }
        : {}),
      ...(dto.publicEmail !== undefined
        ? { publicEmail: this.cleanText(dto.publicEmail) }
        : {}),
      ...(dto.publicPhone !== undefined
        ? { publicPhone: this.cleanText(dto.publicPhone) }
        : {}),
      ...(dto.bookingUrl !== undefined
        ? { bookingUrl: this.cleanText(dto.bookingUrl) }
        : {}),
    };
  }

  private ensurePublicContact(contact: {
    publicEmail: string | null;
    publicPhone: string | null;
    bookingUrl: string | null;
  }) {
    if (!contact.publicEmail && !contact.publicPhone && !contact.bookingUrl) {
      throw new BadRequestException(
        'Add at least one public email, phone number, or booking link.',
      );
    }
  }

  private async blockedUserIds(viewerId: string) {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    return rows.map((row) =>
      row.blockerId === viewerId ? row.blockedId : row.blockerId,
    );
  }

  async search(viewerId: string, dto: SearchCoachesDto) {
    const excludedIds = await this.blockedUserIds(viewerId);
    const where: Prisma.CoachProfileWhereInput = {
      userId: { notIn: excludedIds },
      user: {
        is: {
          accountStatus: AccountStatus.ACTIVE,
          onboardingStep: OnboardingStep.COMPLETE,
          ...(dto.search
            ? {
                OR: [
                  { firstName: { contains: dto.search, mode: 'insensitive' } },
                  { lastName: { contains: dto.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      ...(dto.level ? { levels: { has: dto.level } } : {}),
      ...(dto.clubId || dto.clubName
        ? {
            affiliations: {
              some: {
                ...(dto.clubId ? { clubId: dto.clubId } : {}),
                ...(dto.clubName
                  ? {
                      club: {
                        name: { contains: dto.clubName, mode: 'insensitive' },
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    };
    const candidates = await this.prisma.coachProfile.findMany({
      where,
      include: coachInclude,
      orderBy: [{ verificationStatus: 'desc' }, { createdAt: 'desc' }],
    });
    const specialisation = dto.specialisation?.trim().toLowerCase();
    const filtered = specialisation
      ? candidates.filter((coach) =>
          coach.specialisations.some((item) =>
            item.toLowerCase().includes(specialisation),
          ),
        )
      : candidates;
    const skip = dto.skip ?? 0;
    const take = dto.take ?? DEFAULT_TAKE;
    return {
      total: filtered.length,
      coaches: filtered.slice(skip, skip + take).map(toCoachSummary),
    };
  }

  async findOne(viewerId: string, coachId: string) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { id: coachId },
      include: coachInclude,
    });
    if (!coach || coach.user.accountStatus !== AccountStatus.ACTIVE) {
      throw new NotFoundException('Coach not found.');
    }
    const blocked = await this.prisma.block.findFirst({
      where: blockBetween(viewerId, coach.userId),
    });
    if (blocked) throw new NotFoundException('Coach not found.');
    return toCoachDetail(coach);
  }

  async listForClub(clubId: string) {
    const coaches = await this.prisma.coachProfile.findMany({
      where: {
        affiliations: { some: { clubId } },
        user: { is: { accountStatus: AccountStatus.ACTIVE } },
      },
      include: coachInclude,
      orderBy: [{ verificationStatus: 'desc' }, { createdAt: 'desc' }],
    });
    return { coaches: coaches.map(toCoachAdminDetail) };
  }

  async findForClub(clubId: string, coachId: string) {
    const coach = await this.prisma.coachProfile.findFirst({
      where: { id: coachId, affiliations: { some: { clubId } } },
      include: coachInclude,
    });
    if (!coach) throw new NotFoundException('Coach not found for this club.');
    return toCoachAdminDetail(coach);
  }

  async createForClub(clubId: string, dto: CreateCoachDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.accountEmail.trim().toLowerCase() },
      select: { id: true, accountStatus: true, onboardingStep: true },
    });
    if (
      !user ||
      user.accountStatus !== AccountStatus.ACTIVE ||
      user.onboardingStep !== OnboardingStep.COMPLETE
    ) {
      throw new NotFoundException(
        'No active, onboarded Drift account uses that email.',
      );
    }

    const existing = await this.prisma.coachProfile.findUnique({
      where: { userId: user.id },
    });
    const update = this.updateData(dto);
    const contact = {
      publicEmail:
        update.publicEmail === undefined
          ? (existing?.publicEmail ?? null)
          : (update.publicEmail as string | null),
      publicPhone:
        update.publicPhone === undefined
          ? (existing?.publicPhone ?? null)
          : (update.publicPhone as string | null),
      bookingUrl:
        update.bookingUrl === undefined
          ? (existing?.bookingUrl ?? null)
          : (update.bookingUrl as string | null),
    };
    this.ensurePublicContact(contact);

    if (
      existing &&
      (await this.prisma.coachClubAffiliation.findUnique({
        where: {
          coachProfileId_clubId: {
            coachProfileId: existing.id,
            clubId,
          },
        },
      }))
    ) {
      throw new ConflictException('This coach is already linked to the club.');
    }

    const coachId = await this.prisma.$transaction(async (tx) => {
      const coach = await tx.coachProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          bio: this.cleanText(dto.bio) ?? null,
          qualifications: this.cleanList(dto.qualifications) ?? [],
          yearsExperience: dto.yearsExperience ?? null,
          specialisations: this.cleanList(dto.specialisations) ?? [],
          levels: dto.levels ?? [],
          availabilityNote: this.cleanText(dto.availabilityNote) ?? null,
          ...contact,
        },
        update,
      });
      await tx.coachClubAffiliation.create({
        data: { coachProfileId: coach.id, clubId },
      });
      return coach.id;
    });
    return this.findForClub(clubId, coachId);
  }

  async updateForClub(
    clubId: string,
    coachId: string,
    dto: UpdateCoachDto,
  ) {
    const existing = await this.prisma.coachProfile.findFirst({
      where: { id: coachId, affiliations: { some: { clubId } } },
      include: coachInclude,
    });
    if (!existing) {
      throw new NotFoundException('Coach not found for this club.');
    }
    const update = this.updateData(dto);
    this.ensurePublicContact({
      publicEmail:
        update.publicEmail === undefined
          ? existing.publicEmail
          : (update.publicEmail as string | null),
      publicPhone:
        update.publicPhone === undefined
          ? existing.publicPhone
          : (update.publicPhone as string | null),
      bookingUrl:
        update.bookingUrl === undefined
          ? existing.bookingUrl
          : (update.bookingUrl as string | null),
    });
    await this.prisma.coachProfile.update({
      where: { id: coachId },
      data: update,
    });
    return this.findForClub(clubId, coachId);
  }
}
