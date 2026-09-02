import { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSendEachForMulticast = jest.fn();
const mockInitializeApp = jest.fn(() => ({ name: 'drift-push' }));

// Mirrors firebase-admin 14's *modular* entry points. Worth stating plainly:
// an earlier version of this mock reproduced the legacy `admin.*` namespace,
// which v14 no longer has — the suite passed green against an API that does
// not exist, and only `tsc` caught it. A mock is only as honest as the shape
// it copies.
jest.mock('firebase-admin/app', () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  cert: jest.fn((c: unknown) => c),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    sendEachForMulticast: (...args: unknown[]) =>
      mockSendEachForMulticast(...args),
  }),
}));

/** A syntactically valid service account — the contents never reach a real
 * Firebase, only `credential.cert`, which is mocked. */
const SERVICE_ACCOUNT = JSON.stringify({
  projectId: 'drift-tennis',
  clientEmail: 'push@drift-tennis.iam.gserviceaccount.com',
  privateKey: 'not-a-real-key',
});

type MockPrisma = { deviceToken: Record<string, jest.Mock> };

function createMockPrisma(): MockPrisma {
  return {
    deviceToken: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function makeService(env: Record<string, string>, prisma: MockPrisma) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
  return new PushService(config, prisma as unknown as PrismaService);
}

function ok() {
  return { success: true };
}

function retired() {
  return {
    success: false,
    error: { code: 'messaging/registration-token-not-registered' },
  };
}

describe('PushService', () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockSendEachForMulticast.mockReset();
    mockInitializeApp.mockClear();
  });

  describe('when unconfigured', () => {
    it('is disabled and every send is a silent no-op', async () => {
      const service = makeService({}, prisma);

      expect(service.enabled).toBe(false);
      await service.sendToUser('user-1', 'Title', 'Body', {
        category: 'MATCHES',
      });

      // Not even a device lookup — an unconfigured deployment must behave
      // exactly as it did before this feature existed.
      expect(prisma.deviceToken.findMany).not.toHaveBeenCalled();
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('stays disabled rather than refusing to boot on a malformed account', async () => {
      const service = makeService(
        { FIREBASE_SERVICE_ACCOUNT: 'not json at all' },
        prisma,
      );

      expect(service.enabled).toBe(false);
      await expect(
        service.sendToUser('user-1', 'T', 'B', { category: 'MATCHES' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('when configured', () => {
    let service: PushService;

    beforeEach(() => {
      service = makeService(
        { FIREBASE_SERVICE_ACCOUNT: SERVICE_ACCOUNT },
        prisma,
      );
    });

    it('sends to every device the user has registered', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([
        { token: 'tok-a' },
        { token: 'tok-b' },
      ]);
      mockSendEachForMulticast.mockResolvedValue({
        failureCount: 0,
        responses: [ok(), ok()],
      });

      await service.sendToUser('user-1', 'Title', 'Body', {
        category: 'MATCHES',
        relatedEntityType: 'MATCH',
        relatedEntityId: 'match-1',
      });

      expect(mockSendEachForMulticast).toHaveBeenCalledWith({
        tokens: ['tok-a', 'tok-b'],
        notification: { title: 'Title', body: 'Body' },
        // Every data value must be a string, and the app reads these on tap
        // to open the same screen the in-app row would.
        data: {
          category: 'MATCHES',
          relatedEntityType: 'MATCH',
          relatedEntityId: 'match-1',
        },
      });
    });

    it('omits absent related-entity fields rather than sending undefined', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([{ token: 'tok-a' }]);
      mockSendEachForMulticast.mockResolvedValue({
        failureCount: 0,
        responses: [ok()],
      });

      await service.sendToUser('user-1', 'Title', 'Body', {
        category: 'NEWS',
      });

      // FCM rejects an undefined data value outright.
      expect(mockSendEachForMulticast.mock.calls[0][0].data).toEqual({
        category: 'NEWS',
      });
    });

    it('does not call FCM at all when the user has no devices', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([]);

      await service.sendToUser('user-1', 'Title', 'Body', {
        category: 'MATCHES',
      });

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('prunes tokens FCM reports as retired', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([
        { token: 'live' },
        { token: 'dead' },
      ]);
      mockSendEachForMulticast.mockResolvedValue({
        failureCount: 1,
        responses: [ok(), retired()],
      });

      await service.sendToUser('user-1', 'Title', 'Body', {
        category: 'MATCHES',
      });

      // Only the retired one — this response is the sole reliable signal a
      // token is dead, and without acting on it the table grows forever.
      expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ['dead'] } },
      });
    });

    it('keeps a token that failed for a transient reason', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([{ token: 'live' }]);
      mockSendEachForMulticast.mockResolvedValue({
        failureCount: 1,
        responses: [
          { success: false, error: { code: 'messaging/internal-error' } },
        ],
      });

      await service.sendToUser('user-1', 'Title', 'Body', {
        category: 'MATCHES',
      });

      expect(prisma.deviceToken.deleteMany).not.toHaveBeenCalled();
    });

    it('never throws when FCM itself fails', async () => {
      prisma.deviceToken.findMany.mockResolvedValue([{ token: 'tok-a' }]);
      mockSendEachForMulticast.mockRejectedValue(new Error('FCM unreachable'));

      // The caller is finishing a match confirmation; a push outage must not
      // fail it.
      await expect(
        service.sendToUser('user-1', 'Title', 'Body', { category: 'MATCHES' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('device registration', () => {
    it('upserts on the token so a shared handset moves to its new owner', async () => {
      const service = makeService({}, prisma);

      await service.registerDevice('user-2', 'tok-a', 'ANDROID');

      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
        where: { token: 'tok-a' },
        create: { token: 'tok-a', userId: 'user-2', platform: 'ANDROID' },
        update: { userId: 'user-2', platform: 'ANDROID' },
      });
    });

    it('removes only the caller\'s own token', async () => {
      const service = makeService({}, prisma);

      await service.removeDevice('user-1', 'tok-a');

      // Scoped by userId so one account cannot deregister another's device.
      expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'tok-a', userId: 'user-1' },
      });
    });

    it('registers even while push itself is disabled', async () => {
      // Tokens must accumulate before credentials exist, or the first
      // configured deploy reaches nobody until every app relaunches.
      const service = makeService({}, prisma);
      expect(service.enabled).toBe(false);

      await service.registerDevice('user-1', 'tok-a', 'IOS');

      expect(prisma.deviceToken.upsert).toHaveBeenCalled();
    });
  });
});
