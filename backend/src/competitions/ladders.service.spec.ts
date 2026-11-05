import { BadRequestException } from '@nestjs/common';
import { LaddersService } from './ladders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LaddersService community membership', () => {
  it('requires ACTIVE membership to join a community ladder', async () => {
    const prisma: any = {
      ladder: { findUnique: jest.fn().mockResolvedValue({ id: 'ladder-1', state: 'ACTIVE', communityId: 'community-1' }) },
      communityMember: { findUnique: jest.fn().mockResolvedValue({ status: 'REQUESTED' }) },
      ladderEntry: {
        findUnique: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _max: { position: null } }),
        create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
      },
    };
    const service = new LaddersService(prisma as PrismaService, {} as any, {} as any);
    await expect(service.join('ladder-1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.ladderEntry.create).not.toHaveBeenCalled();

    prisma.communityMember.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    await service.join('ladder-1', 'u1');
    expect(prisma.ladderEntry.create).toHaveBeenCalledWith({ data: { ladderId: 'ladder-1', userId: 'u1', position: 1 } });
  });
});
