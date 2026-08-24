import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { RealtimePublisher } from '../messaging/realtime.publisher';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchRecord } from './match.mapper';

type MockPrisma = {
  user: Record<string, jest.Mock>;
  block: Record<string, jest.Mock>;
  match: Record<string, jest.Mock>;
  matchParticipant: Record<string, jest.Mock>;
  timeProposal: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'other' }) },
    block: { findFirst: jest.fn().mockResolvedValue(null) },
    match: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'm1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    matchParticipant: {
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    timeProposal: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return prisma;
}

const user = (id: string) => ({
  id,
  firstName: 'Test',
  lastName: id,
  photoUrl: null,
  tennisProfile: null,
});

function participant(
  userId: string,
  overrides: Partial<{
    side: string;
    role: string;
    status: string;
  }> = {},
) {
  return {
    userId,
    side: overrides.side ?? 'A',
    role: overrides.role ?? 'CHALLENGER',
    status: overrides.status ?? 'ACCEPTED',
    user: user(userId),
  };
}

function matchRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    sport: 'TENNIS',
    format: 'SINGLES',
    state: 'SCHEDULING',
    createdById: 'me',
    confirmedTime: null,
    courtName: null,
    courtNote: null,
    proposalRound: 0,
    expiresAt: new Date(Date.now() + 60_000),
    cancelReason: null,
    createdAt: new Date(),
    conversation: { id: 'c1' },
    participants: [
      participant('me'),
      participant('other', { side: 'B', role: 'OPPONENT' }),
    ],
    timeProposals: [],
    ...overrides,
  };
}

describe('MatchesService', () => {
  let service: MatchesService;
  let prisma: MockPrisma;
  let messaging: { [K in keyof MessagingService]?: jest.Mock };
  let notifications: { [K in keyof NotificationsService]?: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrisma();
    messaging = {
      ensureMatchConversation: jest.fn().mockResolvedValue({ id: 'c1' }),
      addParticipants: jest.fn().mockResolvedValue(undefined),
      writeSystemMessage: jest.fn().mockResolvedValue({}),
    };
    notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    service = new MatchesService(
      prisma as unknown as PrismaService,
      messaging as unknown as MessagingService,
      new RealtimePublisher(),
      notifications as unknown as NotificationsService,
    );
  });

  describe('create', () => {
    it('rejects challenging yourself', async () => {
      await expect(
        service.create('me', { opponentId: 'me' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hides a blocked opponent behind not-found', async () => {
      prisma.block.findFirst.mockResolvedValue({ id: 'b1' });
      await expect(
        service.create('me', { opponentId: 'other' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an opponent who has not finished onboarding', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.create('me', { opponentId: 'other' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('auto-accepts the challenger and invites the opponent', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());
      await service.create('me', { opponentId: 'other' });

      const data = prisma.match.create.mock.calls[0][0].data;
      const created = data.participants.createMany.data;
      expect(created).toHaveLength(2);
      expect(created[0]).toMatchObject({
        userId: 'me',
        status: 'ACCEPTED',
        role: 'CHALLENGER',
      });
      expect(created[1]).toMatchObject({
        userId: 'other',
        status: 'INVITED',
        role: 'OPPONENT',
      });
      expect(data.state).toBe('PROPOSED');
    });

    it('notifies the opponent of the new challenge', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());
      await service.create('me', { opponentId: 'other' });

      expect(notifications.create).toHaveBeenCalledWith(
        'other',
        'MATCHES',
        expect.stringContaining('challenged you'),
        expect.any(String),
        'MATCH',
        expect.any(String),
      );
    });

    it('requires the challenger to name a partner for doubles', async () => {
      await expect(
        service.create('me', { opponentId: 'other', format: 'DOUBLES' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a partner who is also the opponent', async () => {
      await expect(
        service.create('me', {
          opponentId: 'other',
          format: 'DOUBLES',
          partnerId: 'other',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates three participants for a doubles challenge', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ format: 'DOUBLES' }),
      );
      await service.create('me', {
        opponentId: 'other',
        format: 'DOUBLES',
        partnerId: 'mate',
      });

      const created =
        prisma.match.create.mock.calls[0][0].data.participants.createMany.data;
      // The opponent's partner is nominated later, on accept.
      expect(created).toHaveLength(3);
      expect(created[2]).toMatchObject({
        userId: 'mate',
        side: 'A',
        role: 'PARTNER',
        status: 'INVITED',
      });
    });

    it('opens a conversation for the match', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());
      await service.create('me', { opponentId: 'other' });
      expect(messaging.ensureMatchConversation).toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('moves a singles match to SCHEDULING once the opponent is in', async () => {
      prisma.match.findUnique
        .mockResolvedValueOnce(
          matchRecord({
            state: 'PROPOSED',
            participants: [
              participant('me'),
              participant('other', {
                side: 'B',
                role: 'OPPONENT',
                status: 'INVITED',
              }),
            ],
          }),
        )
        .mockResolvedValue(
          matchRecord({
            state: 'PROPOSED',
            participants: [
              participant('me'),
              participant('other', { side: 'B', role: 'OPPONENT' }),
            ],
          }),
        );

      await service.accept('other', 'm1');

      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { state: 'SCHEDULING' } }),
      );
    });

    it('stays PROPOSED while a doubles partner is still outstanding', async () => {
      const withPendingPartner = matchRecord({
        format: 'DOUBLES',
        state: 'PROPOSED',
        participants: [
          participant('me'),
          participant('mate', { role: 'PARTNER', status: 'INVITED' }),
          participant('other', { side: 'B', role: 'OPPONENT' }),
          participant('other2', {
            side: 'B',
            role: 'PARTNER',
            status: 'INVITED',
          }),
        ],
      });
      prisma.match.findUnique.mockResolvedValue(withPendingPartner);

      await service.accept('mate', 'm1');

      // Some participants are still INVITED, so no transition.
      expect(prisma.match.update).not.toHaveBeenCalled();
    });

    it('requires the doubles opponent to nominate a partner', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          format: 'DOUBLES',
          state: 'PROPOSED',
          participants: [
            participant('me'),
            participant('mate', { role: 'PARTNER' }),
            participant('other', {
              side: 'B',
              role: 'OPPONENT',
              status: 'INVITED',
            }),
          ],
        }),
      );

      await expect(service.accept('other', 'm1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects accepting twice', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ state: 'PROPOSED' }),
      );
      await expect(service.accept('me', 'm1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('hides a match you are not part of', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());
      await expect(service.accept('stranger', 'm1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to act on a lapsed challenge', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          state: 'PROPOSED',
          expiresAt: new Date(Date.now() - 1000),
          participants: [
            participant('me'),
            participant('other', {
              side: 'B',
              role: 'OPPONENT',
              status: 'INVITED',
            }),
          ],
        }),
      );
      await expect(service.accept('other', 'm1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('proposeTimes', () => {
    const future = () => new Date(Date.now() + 86_400_000);

    it('rejects proposing before everyone has accepted', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ state: 'PROPOSED' }),
      );
      await expect(
        service.proposeTimes('me', 'm1', { options: [future()] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects times in the past', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());
      await expect(
        service.proposeTimes('me', 'm1', {
          options: [new Date(Date.now() - 1000)],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stops at the 3-round bound from §4.2', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ proposalRound: 3 }),
      );
      await expect(
        service.proposeTimes('me', 'm1', { options: [future()] }),
      ).rejects.toThrow(/chat/i);
    });

    it('stops you proposing twice in a row', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          timeProposals: [
            { id: 'p1', status: 'PENDING', proposedById: 'me', options: [] },
          ],
        }),
      );
      await expect(
        service.proposeTimes('me', 'm1', { options: [future()] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('supersedes the open proposal when countering', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          proposalRound: 1,
          timeProposals: [
            { id: 'p1', status: 'PENDING', proposedById: 'other', options: [] },
          ],
        }),
      );

      await service.proposeTimes('me', 'm1', { options: [future()] });

      expect(prisma.timeProposal.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'SUPERSEDED' },
      });
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { proposalRound: 2 },
      });
    });
  });

  describe('acceptTime', () => {
    const option = { id: 'o1', startsAt: new Date(Date.now() + 86_400_000) };

    it('rejects accepting your own proposal', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          timeProposals: [
            {
              id: 'p1',
              status: 'PENDING',
              proposedById: 'me',
              options: [option],
            },
          ],
        }),
      );
      await expect(service.acceptTime('me', 'm1', 'o1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a time that was not offered', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          timeProposals: [
            {
              id: 'p1',
              status: 'PENDING',
              proposedById: 'other',
              options: [option],
            },
          ],
        }),
      );
      await expect(
        service.acceptTime('me', 'm1', 'nope'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('schedules the match and clears the expiry', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          timeProposals: [
            {
              id: 'p1',
              status: 'PENDING',
              proposedById: 'other',
              options: [option],
            },
          ],
        }),
      );

      await service.acceptTime('me', 'm1', 'o1');

      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: {
          state: 'SCHEDULED',
          confirmedTime: option.startsAt,
          expiresAt: null,
        },
      });
    });
  });

  describe('decline', () => {
    it('collapses the whole match, per §4.2', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          state: 'PROPOSED',
          participants: [
            participant('me'),
            participant('other', {
              side: 'B',
              role: 'OPPONENT',
              status: 'INVITED',
            }),
          ],
        }),
      );

      await service.decline('other', 'm1');

      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ state: 'CANCELLED' }),
        }),
      );
    });

    it('tells the challenger to cancel instead', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ state: 'PROPOSED' }),
      );
      await expect(service.decline('me', 'm1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('reschedule', () => {
    it('reopens negotiation with a fresh round budget', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ state: 'SCHEDULED', proposalRound: 3 }),
      );

      await service.reschedule('me', 'm1');

      const data = prisma.match.update.mock.calls[0][0].data;
      expect(data.state).toBe('RESCHEDULED');
      expect(data.confirmedTime).toBeNull();
      expect(data.proposalRound).toBe(0);
    });
  });
  // ------------------------------------------------------- notification wiring
  //
  // Every transition already calls announce(), which only reaches someone who
  // opens the match thread. These cover the Notification Centre half.

  describe('notification triggers', () => {
    const recipients = () =>
      (notifications.create!.mock.calls as unknown[][])
        .map((c) => c[0] as string)
        .sort();

    const titleFor = (userId: string) =>
      (notifications.create!.mock.calls as unknown[][]).find(
        (c) => c[0] === userId,
      )?.[2] as string | undefined;

    const doubles = () =>
      matchRecord({
        format: 'DOUBLES',
        participants: [
          participant('me'),
          participant('mate', { role: 'PARTNER' }),
          participant('other', { side: 'B', role: 'OPPONENT' }),
          participant('other2', { side: 'B', role: 'PARTNER' }),
        ],
      });

    it('notifyOthers reaches all three other players in doubles, never the actor', async () => {
      await service.notifyOthers(
        doubles() as unknown as MatchRecord,
        'me',
        'Title',
        'Body',
      );

      expect(recipients()).toEqual(['mate', 'other', 'other2']);
    });

    it('notifyOthers with a null actor reaches everyone — the admin-ruling case', async () => {
      await service.notifyOthers(
        doubles() as unknown as MatchRecord,
        null,
        'Title',
        'Body',
      );

      expect(recipients()).toEqual(['mate', 'me', 'other', 'other2']);
    });

    it('notifyOthers carries the MATCH deep link the Notification Centre routes on', async () => {
      await service.notifyOthers(
        matchRecord() as unknown as MatchRecord,
        'me',
        'Title',
        'Body',
      );

      expect(notifications.create).toHaveBeenCalledWith(
        'other',
        'MATCHES',
        'Title',
        'Body',
        'MATCH',
        'm1',
      );
    });

    it('sends the opponent and the partner different messages on a doubles challenge', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ format: 'DOUBLES' }),
      );

      await service.create('me', {
        opponentId: 'other',
        partnerId: 'mate',
        format: 'DOUBLES',
      });

      // The partner is being asked to partner, not challenged — the two
      // must not collapse into one broadcast.
      expect(titleFor('other')).toContain('challenged you');
      expect(titleFor('mate')).toContain('doubles partner');
    });

    it('invites a nominated partner and excludes them from the acceptance fan-out', async () => {
      const pending = matchRecord({
        format: 'DOUBLES',
        state: 'PROPOSED',
        participants: [
          participant('me'),
          participant('mate', { role: 'PARTNER' }),
          participant('other', {
            side: 'B',
            role: 'OPPONENT',
            status: 'INVITED',
          }),
        ],
      });
      prisma.match.findUnique.mockResolvedValueOnce(pending).mockResolvedValue(
        matchRecord({
          format: 'DOUBLES',
          state: 'PROPOSED',
          participants: [
            participant('me'),
            participant('mate', { role: 'PARTNER' }),
            participant('other', { side: 'B', role: 'OPPONENT' }),
            participant('other2', {
              side: 'B',
              role: 'PARTNER',
              status: 'INVITED',
            }),
          ],
        }),
      );

      await service.accept('other', 'm1', 'other2');

      // other2 hears "be my partner"; everyone else hears "accepted".
      expect(titleFor('other2')).toContain('doubles partner');
      expect(titleFor('me')).toContain('accepted your challenge');
      expect(recipients()).not.toContain('other');
    });

    it('tells the challenger when a challenge is declined', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          state: 'PROPOSED',
          participants: [
            participant('me'),
            participant('other', {
              side: 'B',
              role: 'OPPONENT',
              status: 'INVITED',
            }),
          ],
        }),
      );

      await service.decline('other', 'm1');

      expect(titleFor('me')).toContain('declined your challenge');
      expect(recipients()).toEqual(['me']);
    });

    it('tells the other side when times are proposed', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());

      await service.proposeTimes('me', 'm1', {
        options: [new Date(Date.now() + 86_400_000)],
      });

      expect(titleFor('other')).toContain('proposed a time');
    });

    it('tells the other side when a time is accepted', async () => {
      const startsAt = new Date(Date.now() + 86_400_000);
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({
          timeProposals: [
            {
              id: 'tp1',
              proposedById: 'other',
              status: 'PENDING',
              round: 1,
              options: [{ id: 'o1', startsAt }],
            },
          ],
        }),
      );

      await service.acceptTime('me', 'm1', 'o1');

      expect(titleFor('other')).toBe('Your match is confirmed');
    });

    it('tells the other side when a court is suggested', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());

      await service.suggestCourt('me', 'm1', 'Riverside Courts');

      expect(titleFor('other')).toContain('suggested a court');
    });

    it('tells the other side when a reschedule is requested', async () => {
      prisma.match.findUnique.mockResolvedValue(
        matchRecord({ state: 'SCHEDULED' }),
      );

      await service.reschedule('me', 'm1');

      expect(titleFor('other')).toContain('wants to reschedule');
    });

    it('tells the other side when the match is cancelled, with the reason', async () => {
      prisma.match.findUnique.mockResolvedValue(matchRecord());

      await service.cancel('me', 'm1', 'Injured');

      expect(titleFor('other')).toContain('cancelled the match');
      expect(
        (notifications.create!.mock.calls as unknown[][]).find(
          (c) => c[0] === 'other',
        )?.[3],
      ).toBe('Injured');
    });
  });
});
