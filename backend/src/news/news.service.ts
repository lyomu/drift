import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { storyInclude, toStoryDetail, toStorySummary } from './news.mapper';
import { SearchNewsDto } from './dto/search-news.dto';

const DEFAULT_TAKE = 20;

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- reads

  async browse(userId: string, dto: SearchNewsDto) {
    const where: Prisma.NewsStoryWhereInput = { moderationStatus: 'APPROVED' };
    if (dto.category) {
      where.categories = { has: dto.category };
    }

    const [total, stories, savedIds] = await Promise.all([
      this.prisma.newsStory.count({ where }),
      this.prisma.newsStory.findMany({
        where,
        include: storyInclude,
        orderBy: { publicationDate: 'desc' },
        take: dto.take ?? DEFAULT_TAKE,
        skip: dto.skip ?? 0,
      }),
      this.savedStoryIds(userId),
    ]);

    return {
      total,
      stories: stories.map((s) => toStorySummary(s, savedIds.has(s.id))),
    };
  }

  async getStory(userId: string, id: string) {
    const story = await this.prisma.newsStory.findFirst({
      where: { id, moderationStatus: 'APPROVED' },
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
      where: { userId },
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
      where: { id: storyId, moderationStatus: 'APPROVED' },
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
