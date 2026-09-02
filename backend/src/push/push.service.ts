import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// firebase-admin 14 dropped the legacy `admin.*` namespace for the modular
// entry points below. Importing the root package still works at runtime but
// no longer carries `credential`, `messaging` or the `app.App` type.
import { App, cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, SendResponse } from 'firebase-admin/messaging';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Extra fields delivered alongside the visible notification. The app reads
 * these on tap to open the same screen the in-app row would. */
export interface PushData {
  category: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * FCM error code for a token that has been uninstalled, rotated, or otherwise
 * retired. It is the only reliable signal a token is dead — without acting on
 * it the table grows forever and every send burns quota on addresses that can
 * never receive.
 */
const TOKEN_RETIRED = 'messaging/registration-token-not-registered';

/**
 * Push delivery via Firebase Cloud Messaging, which fans out to both APNs and
 * Android. Shaped deliberately like `MailerService`: configured entirely from
 * env, **disabled when `FIREBASE_SERVICE_ACCOUNT` is absent**, and every send
 * a silent no-op in that state — so a deployment without credentials behaves
 * exactly as it does today rather than failing.
 *
 * Sends never throw. A push is a re-engagement path, never the only route to
 * information (everything pushed is already in the Notification Centre), so a
 * Google outage must not fail the match confirmation that triggered it.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly app: App | null = null;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const raw = config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) return;

    try {
      const credentials = JSON.parse(raw) as ServiceAccount;
      // Named so repeated construction in tests can't collide with the
      // default app another part of the process might own.
      this.app = initializeApp({ credential: cert(credentials) }, 'drift-push');
      this.logger.log('FCM configured');
    } catch (err) {
      // A malformed service account is a deployment mistake, not a runtime
      // condition — say so loudly, then carry on disabled rather than
      // preventing the API from booting at all.
      this.logger.error(
        `FIREBASE_SERVICE_ACCOUNT could not be parsed, push is disabled: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  get enabled(): boolean {
    return this.app !== null;
  }

  async registerDevice(
    userId: string,
    token: string,
    platform: DevicePlatform,
  ): Promise<void> {
    // Upsert on `token` alone, so a handset that changes hands moves to its
    // new owner instead of notifying both.
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { token, userId, platform },
      update: { userId, platform },
    });
  }

  /**
   * Called on logout. Leaving the token behind would deliver the previous
   * user's notifications to whoever signs in on that handset next, so this is
   * a correctness requirement rather than cleanup.
   */
  async removeDevice(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data: PushData,
  ): Promise<void> {
    if (!this.app) return;

    const devices = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (devices.length === 0) return;

    // Every value in an FCM data payload must be a string, and undefined
    // entries are rejected outright rather than ignored.
    const payload: Record<string, string> = { category: data.category };
    if (data.relatedEntityType) {
      payload.relatedEntityType = data.relatedEntityType;
    }
    if (data.relatedEntityId) {
      payload.relatedEntityId = data.relatedEntityId;
    }

    const tokens = devices.map((d) => d.token);
    try {
      const response = await getMessaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: payload,
      });

      const retired = response.responses
        .map((r, i) => (this.isRetired(r) ? tokens[i] : null))
        .filter((t): t is string => t !== null);

      if (retired.length > 0) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: retired } },
        });
        this.logger.log(`Pruned ${retired.length} retired device token(s)`);
      }

      if (response.failureCount > retired.length) {
        this.logger.warn(
          `Push to ${userId}: ${response.failureCount} of ${tokens.length} failed`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Push to ${userId} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private isRetired(result: SendResponse): boolean {
    return !result.success && result.error?.code === TOKEN_RETIRED;
  }
}
