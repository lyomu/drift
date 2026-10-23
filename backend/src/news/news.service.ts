import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { storyInclude, toStoryDetail, toStorySummary } from './news.mapper';
import { SearchNewsDto } from './dto/search-news.dto';
import { visibleNewsWhere } from './news-rights';

const DEFAULT_TAKE = 20;

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return {
      categories: await this.prisma.newsCategoryConfig.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
        select: { slug: true, label: true },
      }),
    };
  }

  // ---------------------------------------------------------------- reads

  async browse(userId: string, dto: SearchNewsDto) {
    const where: Prisma.NewsStoryWhereInput = visibleNewsWhere();
    if (dto.category) {
      const category = await this.prisma.newsCategoryConfig.findFirst({
        where: { slug: dto.category, enabled: true },
      });
      if (!category) throw new BadRequestException('Unknown news category.');
      where.categories = { has: dto.category };
    }
    const countWhere = { ...where };
    if (dto.cursor && dto.skip) {
      throw new BadRequestException('Use cursor or skip, not both.');
    }
    if (dto.cursor) {
      let decoded: { publicationDate: string; id: string };
      try {
        decoded = JSON.parse(
          Buffer.from(dto.cursor, 'base64url').toString('utf8'),
        ) as typeof decoded;
      } catch {
        throw new BadRequestException('Invalid news cursor.');
      }
      const date = new Date(decoded.publicationDate);
      if (!decoded.id || Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid news cursor.');
      }
      where.AND = [
        {
          OR: [
            { publicationDate: { lt: date } },
            { publicationDate: date, id: { lt: decoded.id } },
          ],
        },
      ];
    }
    const take = dto.take ?? DEFAULT_TAKE;

    const [total, stories, savedIds] = await Promise.all([
      this.prisma.newsStory.count({ where: countWhere }),
      this.prisma.newsStory.findMany({
        where,
        include: storyInclude,
        orderBy: [{ publicationDate: 'desc' }, { id: 'desc' }],
        take: take + 1,
        skip: dto.skip ?? 0,
      }),
      this.savedStoryIds(userId),
    ]);

    return {
      total,
      stories: stories
        .slice(0, take)
        .map((s) => toStorySummary(s, savedIds.has(s.id))),
      nextCursor:
        stories.length > take
          ? Buffer.from(
              JSON.stringify({
                publicationDate:
                  stories[take - 1].publicationDate.toISOString(),
                id: stories[take - 1].id,
              }),
            ).toString('base64url')
          : null,
    };
  }

  async getStory(userId: string, id: string) {
    const story = await this.prisma.newsStory.findFirst({
      where: { id, ...visibleNewsWhere() },
      include: storyInclude,
    });
    if (!story) {
      throw new NotFoundException('Story not found.');
    }
    const saved = await this.prisma.savedStory.findUnique({
      where: { userId_storyId: { userId, storyId: id } },
    });
    return toStoryDetail(story, saved !== null);
  }

  async listSaved(userId: string) {
    const saved = await this.prisma.savedStory.findMany({
      where: { userId, story: visibleNewsWhere() },
      orderBy: { savedAt: 'desc' },
      include: { story: { include: storyInclude } },
    });
    return {
      stories: saved.map((s) => toStorySummary(s.story, true)),
    };
  }

  // ------------------------------------------------------------- actions

  async save(userId: string, storyId: string) {
    const story = await this.prisma.newsStory.findFirst({
      where: { id: storyId, ...visibleNewsWhere() },
    });
    if (!story) {
      throw new NotFoundException('Story not found.');
    }
    await this.prisma.savedStory.upsert({
      where: { userId_storyId: { userId, storyId } },
      update: {},
      create: { userId, storyId },
    });
    return { saved: true };
  }

  async unsave(userId: string, storyId: string) {
    await this.prisma.savedStory.deleteMany({ where: { userId, storyId } });
    return { saved: false };
  }

  // ---------------------------------------------------------------- helpers

  private async savedStoryIds(userId: string): Promise<Set<string>> {
    const saved = await this.prisma.savedStory.findMany({
      where: { userId },
      select: { storyId: true },
    });
    return new Set(saved.map((s) => s.storyId));
  }
}
