import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunityMemberStatus, CommunityRole, CommunityStatus } from '@prisma/client';
import { CommunitiesService } from './communities.service';
import { PrismaService } from '../prisma/prisma.service';
import { demoScopeFor } from '../common/demo-scope';

describe('CommunitiesService', () => {
  let service: CommunitiesService;
  let prisma: any;
  let messaging: any;
  let notifications: any;
  let community: any;
  let tx: any;

  beforeEach(() => {
    community = {
      id: 'c1', name: 'Courtside', status: CommunityStatus.APPROVED,
      joinPolicy: 'OPEN', isDemo: false, createdById: 'owner',
      conversation: { id: 'chat1' },
    };
    tx = {
      communityMember: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      conversationParticipant: { deleteMany: jest.fn() },
    };
    prisma = {
      community: { findUnique: jest.fn().mockResolvedValue(community), delete: jest.fn() },
      communityMember: {
        findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
        deleteMany: jest.fn(), count: jest.fn(), findMany: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ isDemo: false, firstName: 'Bea', lastName: 'Player' }) },
      communityAuditLog: { create: jest.fn() },
      $transaction: jest.fn(async (arg: any) => typeof arg === 'function' ? arg(tx) : Promise.all(arg)),
    };
    messaging = { addParticipants: jest.fn().mockResolvedValue(undefined), removeParticipant: jest.fn() };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new CommunitiesService(prisma as PrismaService, notifications, messaging, {} as any, {} as any, {} as any);
    prisma.communityMember.findMany.mockResolvedValue([]);
  });

  it('joins OPEN communities immediately and adds the member to chat', async () => {
    prisma.communityMember.findUnique.mockResolvedValue(null);
    jest.spyOn(service, 'detail').mockResolvedValue({} as any);
    await service.join('bea', 'c1');
    expect(tx.communityMember.create).toHaveBeenCalledWith({ data: { communityId: 'c1', userId: 'bea', status: CommunityMemberStatus.ACTIVE } });
    expect(messaging.addParticipants).toHaveBeenCalledWith('chat1', ['bea'], tx);
  });

  it('creates a REQUESTED row for BY_REQUEST communities without adding chat access', async () => {
    community.joinPolicy = 'BY_REQUEST';
    prisma.communityMember.findUnique.mockResolvedValue(null);
    prisma.communityMember.create.mockResolvedValue({});
    prisma.communityMember.findMany.mockResolvedValue([{ userId: 'owner' }]);
    jest.spyOn(service, 'detail').mockResolvedValue({} as any);
    await service.join('bea', 'c1');
    expect(prisma.communityMember.create).toHaveBeenCalledWith({ data: { communityId: 'c1', userId: 'bea', status: CommunityMemberStatus.REQUESTED } });
    expect(messaging.addParticipants).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalled();
  });

  it('approves a request and adds the requester to chat; decline deletes a request', async () => {
    prisma.communityMember.findUnique.mockResolvedValue({ id: 'm1', status: CommunityMemberStatus.REQUESTED });
    await service.approveRequestAs('owner', 'c1', 'bea');
    expect(tx.communityMember.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { status: CommunityMemberStatus.ACTIVE } });
    expect(messaging.addParticipants).toHaveBeenCalledWith('chat1', ['bea'], tx);
    await service.declineRequestAs('owner', 'c1', 'bea');
    expect(prisma.communityMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('blocks an owner from leaving while others remain and deletes for the last owner', async () => {
    prisma.communityMember.findUnique.mockResolvedValue({ role: CommunityRole.OWNER, status: CommunityMemberStatus.ACTIVE });
    prisma.communityMember.count.mockResolvedValue(1);
    await expect(service.leave('owner', 'c1')).rejects.toBeInstanceOf(BadRequestException);
    prisma.communityMember.count.mockResolvedValue(0);
    await expect(service.leave('owner', 'c1')).resolves.toEqual({ left: true, deleted: true });
    expect(prisma.community.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('prevents an admin removing the owner or another admin', async () => {
    prisma.communityMember.findUnique.mockResolvedValueOnce({ role: CommunityRole.ADMIN, status: CommunityMemberStatus.ACTIVE }).mockResolvedValueOnce({ role: CommunityRole.OWNER, status: CommunityMemberStatus.ACTIVE });
    await expect(service.removeMember('admin', 'c1', 'owner')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.communityMember.findUnique.mockResolvedValueOnce({ role: CommunityRole.ADMIN, status: CommunityMemberStatus.ACTIVE }).mockResolvedValueOnce({ role: CommunityRole.ADMIN, status: CommunityMemberStatus.ACTIVE });
    await expect(service.removeMember('admin', 'c1', 'other-admin')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('transfers ownership and demotes the prior owner to admin', async () => {
    prisma.communityMember.findUnique.mockResolvedValueOnce({ id: 'owner-row', role: CommunityRole.OWNER, status: CommunityMemberStatus.ACTIVE }).mockResolvedValueOnce({ id: 'target-row', role: CommunityRole.MEMBER, status: CommunityMemberStatus.ACTIVE });
    await service.transferOwnership('owner', 'c1', 'bea');
    expect(prisma.communityMember.update).toHaveBeenNthCalledWith(1, { where: { id: 'owner-row' }, data: { role: CommunityRole.ADMIN } });
    expect(prisma.communityMember.update).toHaveBeenNthCalledWith(2, { where: { id: 'target-row' }, data: { role: CommunityRole.OWNER } });
  });

  it('hides a pending community from anyone except its creator', async () => {
    community.status = CommunityStatus.PENDING;
    community.createdById = 'owner';
    prisma.communityMember.findUnique.mockResolvedValue(null);
    await expect(service.detail('stranger', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks joins while a community is suspended', async () => {
    community.status = CommunityStatus.SUSPENDED;
    await expect(service.join('bea', 'c1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.communityMember.create).not.toHaveBeenCalled();
  });

  it('requires an active manager and approved community to create competitions', async () => {
    prisma.communityMember.findUnique.mockResolvedValue({ role: CommunityRole.MEMBER, status: CommunityMemberStatus.ACTIVE });
    await expect(service.createLadder('bea', 'c1', { name: 'A', challengeRange: 3 } as any)).rejects.toBeInstanceOf(ForbiddenException);
    prisma.communityMember.findUnique.mockResolvedValue({ role: CommunityRole.OWNER, status: CommunityMemberStatus.ACTIVE });
    community.status = CommunityStatus.SUSPENDED;
    await expect(service.createLadder('owner', 'c1', { name: 'A', challengeRange: 3 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('community demo scope', () => {
  it('keeps real and demo community discovery isolated', () => {
    expect(demoScopeFor(false).community).toEqual({ isDemo: false });
    expect(demoScopeFor(true).community).toEqual({});
  });
});
