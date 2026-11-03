import {
  CommunityMemberStatus,
  CommunityRole,
  CommunityStatus,
  Prisma,
} from '@prisma/client';
import { displayName } from '../common/display-name.util';

export const COMMUNITY_PHOTO_PATH = '/media/community-photos';

export const communityInclude = {
  club: { select: { id: true, name: true } },
  conversation: { select: { id: true } },
  _count: {
    select: { members: { where: { status: CommunityMemberStatus.ACTIVE } } },
  },
} satisfies Prisma.CommunityInclude;

export type CommunityRecord = Prisma.CommunityGetPayload<{
  include: typeof communityInclude;
}>;

export interface ViewerMembership {
  role: CommunityRole;
  status: CommunityMemberStatus;
  mutedAt: Date | null;
}

/**
 * The community as the app and consoles see it. The chat id is only handed
 * to ACTIVE members (the conversation's participant list is the real ACL
 * either way), and the platform's rejection note only to the owner.
 */
export function toCommunityDto(
  community: CommunityRecord,
  membership: ViewerMembership | null,
  distanceKm: number | null = null,
) {
  const active = membership?.status === CommunityMemberStatus.ACTIVE;
  const isOwner = active && membership?.role === CommunityRole.OWNER;
  return {
    id: community.id,
    type: community.type,
    name: community.name,
    city: community.city,
    frequency: community.frequency,
    about: community.about,
    photoUrl: community.photoUrl,
    joinPolicy: community.joinPolicy,
    status: community.status,
    decisionNote:
      isOwner && community.status === CommunityStatus.REJECTED
        ? community.decisionNote
        : null,
    clubId: community.club?.id ?? null,
    clubName: community.club?.name ?? null,
    memberCount: community._count.members,
    conversationId: active ? (community.conversation?.id ?? null) : null,
    distanceKm: distanceKm === null ? null : Math.round(distanceKm),
    createdAt: community.createdAt,
    myMembership: membership
      ? {
          role: membership.role,
          status: membership.status,
          muted: membership.mutedAt !== null,
        }
      : null,
  };
}

export const memberUserSelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    photoUrl: true,
    tennisProfile: {
      select: { userSelectedLevel: true, systemSuggestedLevel: true },
    },
  },
} as const;

export function toMemberDto(member: {
  userId: string;
  role: CommunityRole;
  status: CommunityMemberStatus;
  createdAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    tennisProfile: {
      userSelectedLevel: number | null;
      systemSuggestedLevel: number | null;
    } | null;
  };
}) {
  const level =
    member.user.tennisProfile?.userSelectedLevel ??
    member.user.tennisProfile?.systemSuggestedLevel ??
    null;
  return {
    userId: member.userId,
    displayName: displayName(member.user),
    photoUrl: member.user.photoUrl,
    level,
    role: member.role,
    status: member.status,
    since: member.createdAt,
  };
}
