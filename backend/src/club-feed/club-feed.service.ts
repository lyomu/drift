import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClubRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubPostDto, ReactionDto } from './dto/club-post.dto';

const DEFAULT_TAKE = 30;

const MODERATOR_ROLES: ClubRole[] = [ClubRole.OWNER, ClubRole.ADMIN];

@Injectable()
export class ClubFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clubId: string, viewerId: string) {
    const posts = await this.prisma.clubPost.findMany({
      where: { clubId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: DEFAULT_TAKE,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
        reactions: { select: { emoji: true, userId: true } },
      },
    });

    return {
      posts: posts.map((post) => ({
        id: post.id,
        body: post.body,
        createdAt: post.createdAt,
        author: post.author
          ? {
              id: post.author.id,
              name:
                [post.author.firstName, post.author.lastName]
                  .filter(Boolean)
                  .join(' ') || 'A player',
              photoUrl: post.author.photoUrl,
            }
          : null,
        isMine: post.authorId === viewerId,
        // Collapsed to counts plus "did I react", which is all the feed
        // renders — the full reactor list would be a second screen.
        reactions: this.summariseReactions(post.reactions, viewerId),
      })),
    };
  }

  async create(clubId: string, authorId: string, dto: CreateClubPostDto) {
    const post = await this.prisma.clubPost.create({
      data: { clubId, authorId, body: dto.body },
    });
    return { id: post.id, createdAt: post.createdAt };
  }

  /**
   * Authors can delete their own post; OWNER/ADMIN can delete anyone's as
   * moderation. Soft delete either way so the row stays auditable.
   */
  async remove(
    clubId: string,
    postId: string,
    userId: string,
    viewerRole?: ClubRole,
  ) {
    const post = await this.requirePost(clubId, postId);
    const isAuthor = post.authorId === userId;
    const isModerator = !!viewerRole && MODERATOR_ROLES.includes(viewerRole);
    if (!isAuthor && !isModerator) {
      throw new ForbiddenException('You cannot remove this post.');
    }

    await this.prisma.clubPost.update({
      where: { id: postId },
      data: { deletedAt: new Date(), deletedById: userId },
    });
    return { removed: true };
  }

  async react(
    clubId: string,
    postId: string,
    userId: string,
    dto: ReactionDto,
  ) {
    await this.requirePost(clubId, postId);
    await this.prisma.clubPostReaction.upsert({
      where: {
        postId_userId_emoji: { postId, userId, emoji: dto.emoji },
      },
      create: { postId, userId, emoji: dto.emoji },
      update: {},
    });
    return { reacted: true };
  }

  async report(clubId: string, postId: string, reporterId: string, reason: string) {
    await this.requirePost(clubId, postId);
    if (!reason?.trim()) throw new ForbiddenException('A report reason is required.');
    const report = await this.prisma.clubPostModerationReport.create({
      data: { clubId, postId, reporterId, reason: reason.trim() },
    });
    return { reportId: report.id, status: report.status };
  }

  async unreact(
    clubId: string,
    postId: string,
    userId: string,
    dto: ReactionDto,
  ) {
    await this.requirePost(clubId, postId);
    await this.prisma.clubPostReaction.deleteMany({
      where: { postId, userId, emoji: dto.emoji },
    });
    return { reacted: false };
  }

  private summariseReactions(
    reactions: { emoji: string; userId: string }[],
    viewerId: string,
  ) {
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const entry = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      entry.mine = entry.mine || r.userId === viewerId;
      byEmoji.set(r.emoji, entry);
    }
    return [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v }));
  }

  private async requirePost(clubId: string, postId: string) {
    const post = await this.prisma.clubPost.findUnique({
      where: { id: postId },
    });
    if (!post || post.clubId !== clubId || post.deletedAt) {
      throw new NotFoundException('Post not found.');
    }
    return post;
  }
}
