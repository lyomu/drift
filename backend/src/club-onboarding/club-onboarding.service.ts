import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  ClubCreationRequestStatus,
  ClubMembershipStatus,
  ClubPlatformStatus,
  ClubRole,
  OnboardingStep,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompleteClubSetupDto,
  ReviewClubRequestDto,
  SubmitClubRequestDto,
} from './dto/club-onboarding.dto';

const BCRYPT_ROUNDS = 10;
const SETUP_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function splitName(full: string): {
  firstName: string;
  lastName: string | null;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Club', lastName: 'Owner' };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

@Injectable()
export class ClubOnboardingService {
  private readonly isDev: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.isDev = this.config.get<string>('NODE_ENV') !== 'production';
  }

  // ------------------------------------------------------------- public

  async submitRequest(dto: SubmitClubRequestDto) {
    const email = dto.requesterEmail.trim();

    const openRequest = await this.prisma.clubCreationRequest.findFirst({
      where: {
        requesterEmail: email,
        status: {
          in: [
            ClubCreationRequestStatus.PENDING,
            ClubCreationRequestStatus.APPROVED,
          ],
        },
      },
    });
    if (openRequest) {
      throw new BadRequestException(
        openRequest.status === ClubCreationRequestStatus.PENDING
          ? 'A club request for this email is already under review.'
          : 'This email already has an approved request — check your inbox for the setup link.',
      );
    }

    const owns = await this.prisma.clubMembership.findFirst({
      where: { role: ClubRole.OWNER, user: { email } },
    });
    if (owns) {
      throw new BadRequestException('This email already owns a club on Drift.');
    }

    await this.prisma.clubCreationRequest.create({
      data: {
        clubName: dto.clubName.trim(),
        location: dto.location.trim(),
        requesterName: dto.requesterName.trim(),
        requesterEmail: email,
      },
    });
    return { status: ClubCreationRequestStatus.PENDING };
  }

  async getByToken(rawToken: string) {
    const request = await this.loadValidToken(rawToken);
    const account = await this.prisma.user.findUnique({
      where: { email: request.requesterEmail },
      select: { id: true },
    });
    return {
      clubName: request.clubName,
      location: request.location,
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      accountExists: account != null,
    };
  }

  /**
   * Finalises an approved request: creates (or, for an existing account,
   * attaches) the owner and a live club, then burns the token. `authUserId`
   * is populated only when the caller presented a valid player bearer — it is
   * required when a Drift account already exists for the request email, so a
   * link-holder can never take over someone else's account.
   */
  async complete(
    rawToken: string,
    dto: CompleteClubSetupDto,
    authUserId?: string,
  ) {
    const request = await this.loadValidToken(rawToken);
    const existing = await this.prisma.user.findUnique({
      where: { email: request.requesterEmail },
    });

    let userId: string;
    if (existing) {
      if (authUserId !== existing.id) {
        throw new ForbiddenException(
          'An account already exists for this email. Sign in to Drift with it first, then reopen this setup link.',
        );
      }
      userId = existing.id;
    } else {
      if (!dto.password) {
        throw new BadRequestException(
          'Choose a password to create your login.',
        );
      }
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      const { firstName, lastName } = splitName(
        dto.requesterName ?? request.requesterName,
      );
      const created = await this.prisma.user.create({
        data: {
          email: request.requesterEmail,
          passwordHash,
          firstName,
          lastName,
          emailVerifiedAt: new Date(),
          verificationStatus: VerificationStatus.VERIFIED,
          onboardingStep: OnboardingStep.COMPLETE,
          onboardingCompletedAt: new Date(),
          tennisProfile: { create: {} },
        },
      });
      userId = created.id;
    }

    const club = await this.prisma.$transaction(async (tx) => {
      const createdClub = await tx.club.create({
        data: {
          name: request.clubName,
          address: request.location,
          platformStatus: ClubPlatformStatus.ACTIVE,
          setupCompletedAt: null,
        },
      });
      await tx.clubMembership.create({
        data: {
          clubId: createdClub.id,
          userId,
          role: ClubRole.OWNER,
          status: ClubMembershipStatus.ACTIVE,
        },
      });
      await tx.clubCreationRequest.update({
        where: { id: request.id },
        data: {
          completedAt: new Date(),
          createdClubId: createdClub.id,
          setupTokenHash: null,
          setupTokenExpiresAt: null,
        },
      });
      return createdClub;
    });

    return { email: request.requesterEmail, clubId: club.id };
  }

  // ----------------------------------------------------------- platform

  async list(status?: string) {
    const where =
      status && status !== 'ALL'
        ? { status: status as ClubCreationRequestStatus }
        : {};
    const requests = await this.prisma.clubCreationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { requests };
  }

  async review(adminId: string, id: string, dto: ReviewClubRequestDto) {
    const request = await this.prisma.clubCreationRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Club request not found.');
    if (request.status !== ClubCreationRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed.');
    }

    if (dto.action === 'REJECT') {
      if (!dto.decisionNote?.trim()) {
        throw new BadRequestException('A rejection reason is required.');
      }
      const updated = await this.prisma.clubCreationRequest.update({
        where: { id },
        data: {
          status: ClubCreationRequestStatus.REJECTED,
          decisionNote: dto.decisionNote.trim(),
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
      await this.audit(adminId, 'club_request.reject', id, {
        requesterEmail: request.requesterEmail,
      });
      return { request: updated };
    }

    const rawToken = randomBytes(32).toString('hex');
    const updated = await this.prisma.clubCreationRequest.update({
      where: { id },
      data: {
        status: ClubCreationRequestStatus.APPROVED,
        decisionNote: dto.decisionNote?.trim() || null,
        reviewedById: adminId,
        reviewedAt: new Date(),
        setupTokenHash: hashToken(rawToken),
        setupTokenExpiresAt: new Date(Date.now() + SETUP_TOKEN_TTL_MS),
      },
    });

    const setupUrl = `${this.clubAdminUrl()}/setup?token=${rawToken}`;
    // No email delivery exists in this app yet (same gap as auth OTP) — log
    // the link and return it in non-production, mirroring AuthService.devCode.
    console.log(
      `[club-onboarding] setup link for ${request.requesterEmail}: ${setupUrl}`,
    );
    await this.audit(adminId, 'club_request.approve', id, {
      requesterEmail: request.requesterEmail,
    });

    return {
      request: updated,
      ...(this.isDev ? { devSetupUrl: setupUrl } : {}),
    };
  }

  // ----------------------------------------------------------- internals

  private clubAdminUrl(): string {
    return (
      this.config.get<string>('CLUB_ADMIN_URL')?.replace(/\/$/, '') ??
      'http://localhost:3010'
    );
  }

  private async loadValidToken(rawToken: string) {
    const request = await this.prisma.clubCreationRequest.findFirst({
      where: { setupTokenHash: hashToken(rawToken) },
    });
    if (
      !request ||
      request.status !== ClubCreationRequestStatus.APPROVED ||
      request.completedAt != null ||
      request.setupTokenExpiresAt == null ||
      request.setupTokenExpiresAt < new Date()
    ) {
      throw new NotFoundException('This setup link is invalid or has expired.');
    }
    return request;
  }

  private async audit(
    actorId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        entityType: 'ClubCreationRequest',
        entityId,
        metadata: metadata as never,
      },
    });
  }
}
