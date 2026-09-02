import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { toNotificationDto, toPreferencesDto } from './notifications.mapper';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

const DEFAULT_TAKE = 30;

// Maps each category to the preference-row field that gates it — the one
// place this mapping exists, so a new category can't be added to the enum
// without a compiler error here.
const PREFERENCE_FIELD: Record<
  NotificationCategory,
  | 'connections'
  | 'matches'
  | 'messages'
  | 'competitions'
  | 'learning'
  | 'news'
  | 'clubs'
> = {
  CONNECTIONS: 'connections',
  MATCHES: 'matches',
  MESSAGES: 'messages',
  COMPETITIONS: 'competitions',
  LEARNING: 'learning',
  NEWS: 'news',
  CLUBS: 'clubs',
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // ---------------------------------------------------------------- writes

  /**
   * The one entry point every other module calls. Checks the recipient's
   * preference for `category` first and silently skips the write if
   * they've opted out — cheaper than filtering at read time, and it means
   * "0 notifications" genuinely means 0, not "some hidden ones exist".
   */
  async create(
    userId: string,
    category: NotificationCategory,
    title: string,
    body: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ): Promise<void> {
    const preference = await this.getOrCreatePreference(userId);
    if (!preference[PREFERENCE_FIELD[category]]) {
      return;
    }

    await this.prisma.notification.create({
      data: {
        userId,
        category,
        title,
        body,
        relatedEntityType,
        relatedEntityId,
      },
    });

    // The single place push is sent from — every module already funnels
    // through this method, so no call site needs to know push exists, and the
    // preference check above gates push for free.
    //
    // Deliberately not awaited: the caller is finishing a match confirmation
    // or a message send and must not wait on Google. `sendToUser` never
    // throws, so this cannot become an unhandled rejection.
    void this.push.sendToUser(userId, title, body, {
      category,
      relatedEntityType,
      relatedEntityId,
    });
  }

  // ------------------------------------------------------------- devices

  registerDevice(userId: string, dto: RegisterDeviceDto) {
    return this.push
      .registerDevice(userId, dto.token, dto.platform)
      .then(() => ({ registered: true }));
  }

  removeDevice(userId: string, token: string) {
    return this.push
      .removeDevice(userId, token)
      .then(() => ({ removed: true }));
  }

  // ---------------------------------------------------------------- reads

  async list(userId: string) {
    const [total, unreadCount, notifications] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: DEFAULT_TAKE,
      }),
    ]);

    return {
      total,
      unreadCount,
      notifications: notifications.map(toNotificationDto),
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }
    await this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
    return { read: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: true };
  }

  async getPreferences(userId: string) {
    const preference = await this.getOrCreatePreference(userId);
    return toPreferencesDto(preference);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    await this.getOrCreatePreference(userId);
    const preference = await this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        connections: dto.connections,
        matches: dto.matches,
        messages: dto.messages,
        competitions: dto.competitions,
        learning: dto.learning,
        news: dto.news,
        clubs: dto.clubs,
      },
    });
    return toPreferencesDto(preference);
  }

  // ---------------------------------------------------------------- helpers

  private async getOrCreatePreference(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { userId } });
  }
}
