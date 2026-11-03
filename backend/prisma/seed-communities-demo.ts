import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CommunityFrequency,
  CommunityJoinPolicy,
  CommunityMemberStatus,
  CommunityRole,
  CommunityStatus,
  CommunityType,
  ConversationType,
  LadderState,
  LeagueRegistrationStatus,
  LeagueState,
  MatchFormat,
  MatchSport,
  MessageKind,
  PrismaClient,
} from '@prisma/client';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://drift:drift@localhost:5432/drift_tennis';
const parsedDatabaseUrl = new URL(databaseUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(parsedDatabaseUrl.hostname)) {
  throw new Error(
    `Refusing to seed demo communities on non-local host: ${parsedDatabaseUrl.hostname}`,
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ids = {
  openCommunity: 'd0000000-0000-4000-8000-000000000001',
  requestCommunity: 'd0000000-0000-4000-8000-000000000002',
  pendingCommunity: 'd0000000-0000-4000-8000-000000000003',
  conversation: 'd0000000-0000-4000-8000-000000000004',
  firstMessage: 'd0000000-0000-4000-8000-000000000005',
  secondMessage: 'd0000000-0000-4000-8000-000000000006',
  league: 'd0000000-0000-4000-8000-000000000007',
  ladder: 'd0000000-0000-4000-8000-000000000008',
};

async function seedCommunitiesDemo() {
  const [alex, sarah, jordan] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'alex.player@drifttennis.com' } }),
    prisma.user.findUnique({ where: { email: 'sarah.tennis@drifttennis.com' } }),
    prisma.user.findUnique({ where: { email: 'jordan.newbie@drifttennis.com' } }),
  ]);
  if (!alex || !sarah || !jordan) {
    throw new Error(
      'Demo users are missing. Run `npx ts-node prisma/seed-test-users.ts` first.',
    );
  }

  const now = new Date();
  const communityBase = {
    city: 'Nairobi',
    latitude: -1.286389,
    longitude: 36.817223,
    frequency: CommunityFrequency.WEEKLY,
    isDemo: alex.isDemo,
  };

  await prisma.$transaction(async (tx) => {
    await tx.community.upsert({
      where: { id: ids.openCommunity },
      create: {
        id: ids.openCommunity,
        ...communityBase,
        type: CommunityType.SOCIAL,
        name: 'Nairobi Weekend Rally',
        about:
          'Friendly weekly tennis, rotating doubles, and a community ladder for Nairobi players.',
        joinPolicy: CommunityJoinPolicy.OPEN,
        status: CommunityStatus.APPROVED,
        decisionNote: 'Seeded for local feature review.',
        reviewedAt: now,
        createdById: alex.id,
      },
      update: {
        ...communityBase,
        type: CommunityType.SOCIAL,
        name: 'Nairobi Weekend Rally',
        about:
          'Friendly weekly tennis, rotating doubles, and a community ladder for Nairobi players.',
        joinPolicy: CommunityJoinPolicy.OPEN,
        status: CommunityStatus.APPROVED,
        decisionNote: 'Seeded for local feature review.',
        reviewedAt: now,
      },
    });

    await tx.community.upsert({
      where: { id: ids.requestCommunity },
      create: {
        id: ids.requestCommunity,
        ...communityBase,
        type: CommunityType.TRAINING,
        isDemo: sarah.isDemo,
        name: 'Parklands Evening Drills',
        about:
          'Small-group practice for players who want focused evening sessions.',
        joinPolicy: CommunityJoinPolicy.BY_REQUEST,
        status: CommunityStatus.APPROVED,
        decisionNote: 'Seeded for local feature review.',
        reviewedAt: now,
        createdById: sarah.id,
      },
      update: {
        ...communityBase,
        type: CommunityType.TRAINING,
        isDemo: sarah.isDemo,
        name: 'Parklands Evening Drills',
        about:
          'Small-group practice for players who want focused evening sessions.',
        joinPolicy: CommunityJoinPolicy.BY_REQUEST,
        status: CommunityStatus.APPROVED,
        decisionNote: 'Seeded for local feature review.',
        reviewedAt: now,
      },
    });

    await tx.community.upsert({
      where: { id: ids.pendingCommunity },
      create: {
        id: ids.pendingCommunity,
        ...communityBase,
        type: CommunityType.SOCIAL,
        name: 'Nairobi New Players Circle',
        about: 'A welcoming place for newer players to find practice partners.',
        joinPolicy: CommunityJoinPolicy.OPEN,
        status: CommunityStatus.PENDING,
        createdById: alex.id,
      },
      update: {
        ...communityBase,
        type: CommunityType.SOCIAL,
        name: 'Nairobi New Players Circle',
        about: 'A welcoming place for newer players to find practice partners.',
        joinPolicy: CommunityJoinPolicy.OPEN,
        status: CommunityStatus.PENDING,
        reviewedAt: null,
        reviewedById: null,
        decisionNote: null,
      },
    });

    const members = [
      [ids.openCommunity, alex.id, CommunityRole.OWNER, CommunityMemberStatus.ACTIVE],
      [ids.openCommunity, sarah.id, CommunityRole.MEMBER, CommunityMemberStatus.ACTIVE],
      [ids.openCommunity, jordan.id, CommunityRole.MEMBER, CommunityMemberStatus.ACTIVE],
      [ids.requestCommunity, sarah.id, CommunityRole.OWNER, CommunityMemberStatus.ACTIVE],
      [ids.requestCommunity, alex.id, CommunityRole.MEMBER, CommunityMemberStatus.ACTIVE],
      [ids.requestCommunity, jordan.id, CommunityRole.MEMBER, CommunityMemberStatus.REQUESTED],
      [ids.pendingCommunity, alex.id, CommunityRole.OWNER, CommunityMemberStatus.ACTIVE],
    ] as const;
    for (const [communityId, userId, role, status] of members) {
      await tx.communityMember.upsert({
        where: { communityId_userId: { communityId, userId } },
        create: { communityId, userId, role, status },
        update: { role, status },
      });
    }

    const conversation = await tx.conversation.upsert({
      where: { communityId: ids.openCommunity },
      create: {
        id: ids.conversation,
        type: ConversationType.COMMUNITY,
        communityId: ids.openCommunity,
      },
      update: { type: ConversationType.COMMUNITY },
    });
    for (const userId of [alex.id, sarah.id, jordan.id]) {
      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: { conversationId: conversation.id, userId },
        },
        create: { conversationId: conversation.id, userId },
        update: {},
      });
    }
    await tx.message.upsert({
      where: { id: ids.firstMessage },
      create: {
        id: ids.firstMessage,
        conversationId: conversation.id,
        senderId: alex.id,
        kind: MessageKind.TEXT,
        body: 'Welcome to the rally! Share your availability for this weekend.',
      },
      update: { body: 'Welcome to the rally! Share your availability for this weekend.' },
    });
    await tx.message.upsert({
      where: { id: ids.secondMessage },
      create: {
        id: ids.secondMessage,
        conversationId: conversation.id,
        senderId: sarah.id,
        kind: MessageKind.TEXT,
        body: 'I am free Saturday morning. See you on court!',
      },
      update: { body: 'I am free Saturday morning. See you on court!' },
    });

    const league = await tx.league.upsert({
      where: { id: ids.league },
      create: {
        id: ids.league,
        communityId: ids.openCommunity,
        sport: MatchSport.TENNIS,
        name: 'Nairobi Rally Singles League',
        description: 'A friendly singles league for community members.',
        state: LeagueState.PUBLISHED,
        format: MatchFormat.SINGLES,
        registrationOpensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        registrationClosesAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        startsAt: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
        roundCount: 3,
        capacity: 12,
      },
      update: {
        communityId: ids.openCommunity,
        name: 'Nairobi Rally Singles League',
        state: LeagueState.PUBLISHED,
      },
    });
    for (const userId of [alex.id, sarah.id]) {
      await tx.leagueRegistration.upsert({
        where: { leagueId_userId: { leagueId: league.id, userId } },
        create: {
          leagueId: league.id,
          userId,
          status: LeagueRegistrationStatus.ENROLLED,
        },
        update: { status: LeagueRegistrationStatus.ENROLLED },
      });
    }

    const ladder = await tx.ladder.upsert({
      where: { id: ids.ladder },
      create: {
        id: ids.ladder,
        communityId: ids.openCommunity,
        sport: MatchSport.TENNIS,
        name: 'Nairobi Weekend Ladder',
        challengeRange: 2,
        state: LadderState.ACTIVE,
      },
      update: {
        communityId: ids.openCommunity,
        name: 'Nairobi Weekend Ladder',
        state: LadderState.ACTIVE,
      },
    });
    for (const [userId, position] of [
      [sarah.id, 1],
      [alex.id, 2],
      [jordan.id, 3],
    ] as const) {
      await tx.ladderEntry.upsert({
        where: { ladderId_userId: { ladderId: ladder.id, userId } },
        create: { ladderId: ladder.id, userId, position },
        update: { position },
      });
    }
  });

  const seeded = await prisma.community.findMany({
    where: { id: { in: Object.values(ids).slice(0, 3) } },
    orderBy: { name: 'asc' },
    include: { _count: { select: { members: true, leagues: true, ladders: true } } },
  });
  console.log('Seeded local community demo data:');
  for (const community of seeded) {
    console.log(
      `- ${community.name}: ${community.status}/${community.joinPolicy}, ${community._count.members} members, ${community._count.leagues} leagues, ${community._count.ladders} ladders`,
    );
  }
}

seedCommunitiesDemo()
  .catch((error) => {
    console.error('Failed to seed local community demo data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
