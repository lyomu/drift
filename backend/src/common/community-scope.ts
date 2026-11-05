import { CommunityMemberStatus } from '@prisma/client';

/**
 * Where-clause fragment for League and Ladder lists: a community-owned
 * competition is listed only to that community's ACTIVE members. Club-owned
 * and independent ones (no `communityId`) always pass. Put it in an `AND`,
 * like `DemoScope.clubOptional`, so it can't clobber the query's own `OR`.
 *
 * Without a viewer (unauthenticated reads) community competitions are
 * hidden entirely.
 */
export function communityMembersOnly(viewerId?: string) {
  if (!viewerId) return { communityId: null };
  return {
    OR: [
      { communityId: null },
      {
        community: {
          is: {
            members: {
              some: {
                userId: viewerId,
                status: CommunityMemberStatus.ACTIVE,
              },
            },
          },
        },
      },
    ],
  };
}
