import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { blockBetween, connectionBetween } from '../common/relationship.util';
import { playerInclude, toPlayerSummary } from '../players/player.mapper';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateMessageReportDto } from './dto/create-message-report.dto';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Player not found.');
    }
    return user;
  }

  /**
   * Blocking severs the relationship as well as hiding it — leaving an
   * accepted connection behind would keep the pair visible to each other
   * through the connections list. Both happen in one transaction.
   */
  async block(userId: string, blockedId: string) {
    if (userId === blockedId) {
      throw new BadRequestException('You cannot block yourself.');
    }
    await this.requireUser(blockedId);

    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId } },
    });
    if (existing) {
      return { blocked: true };
    }

    await this.prisma.$transaction([
      this.prisma.block.create({ data: { blockerId: userId, blockedId } }),
      this.prisma.connection.deleteMany({
        where: connectionBetween(userId, blockedId),
      }),
    ]);

    return { blocked: true };
  }

  async unblock(userId: string, blockedId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId: userId, blockedId },
    });
    return { blocked: false };
  }

  /** Only blocks the viewer made — not ones made against them. */
  async listBlocks(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { include: playerInclude } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      blocks: blocks.map((b) => ({
        blockedAt: b.createdAt,
        player: toPlayerSummary(b.blocked, null),
      })),
    };
  }

  async report(userId: string, dto: CreateReportDto) {
    if (userId === dto.reportedUserId) {
      throw new BadRequestException('You cannot report yourself.');
    }
    await this.requireUser(dto.reportedUserId);

    const report = await this.prisma.playerReport.create({
      data: {
        reporterId: userId,
        reportedUserId: dto.reportedUserId,
        reason: dto.reason,
        notes: dto.notes,
      },
    });

    return { reportId: report.id, status: report.status };
  }

  /** Chat Thread's "Report" action (Doc 4 §A.9) — mirrors `report()`'s shape. */
  async reportMessage(userId: string, dto: CreateMessageReportDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: dto.messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found.');
    }
    if (message.senderId === userId) {
      throw new BadRequestException('You cannot report your own message.');
    }
    const membership = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId,
        },
      },
    });
    if (!membership) {
      throw new NotFoundException('Message not found.');
    }

    const report = await this.prisma.messageReport.create({
      data: {
        reporterId: userId,
        messageId: dto.messageId,
        reason: dto.reason,
        notes: dto.notes,
      },
    });

    return { reportId: report.id, status: report.status };
  }

  // -------------------------------------------------------- club-admin

  /**
   * Phase M14 — the first reader `CourtReport` has ever had (write-only
   * since M9). Scoped to this club's own courts only: `PlayerReport`/
   * `MessageReport` stay unconsumed here — they read as platform-wide
   * concerns better suited to the not-yet-built Platform Admin, not
   * cleanly club-scoped (see PROGRESS.md).
   */
  async listCourtReportsForClub(clubId: string) {
    const reports = await this.prisma.courtReport.findMany({
      where: { court: { clubId } },
      include: { court: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      reports: reports.map((r) => ({
        id: r.id,
        courtId: r.courtId,
        courtName: r.court.name,
        reason: r.reason,
        notes: r.notes,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  async resolveCourtReport(clubId: string, id: string, status: ReportStatus) {
    const report = await this.prisma.courtReport.findUnique({
      where: { id },
      include: { court: { select: { clubId: true } } },
    });
    if (!report || report.court.clubId !== clubId) {
      throw new NotFoundException('Report not found.');
    }
    const updated = await this.prisma.courtReport.update({
      where: { id },
      data: { status },
    });
    return { id: updated.id, status: updated.status };
  }

  /** True when either user has blocked the other. */
  async isBlockedBetween(userA: string, userB: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: blockBetween(userA, userB),
    });
    return block !== null;
  }
}
