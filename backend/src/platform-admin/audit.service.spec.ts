import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  function setup(queryRaw: jest.Mock = jest.fn()) {
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      adminAuditLog: { create },
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    return { service: new AuditService(prisma), create };
  }

  it('records actor, target, action and reason', async () => {
    const { service, create } = setup();
    await service.record(
      'admin-1',
      'user.suspend',
      'User',
      'u1',
      { previousStatus: 'ACTIVE' },
      '  Repeated harassment reports  ',
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-1',
        action: 'user.suspend',
        entityType: 'User',
        entityId: 'u1',
        reason: 'Repeated harassment reports',
        metadata: { previousStatus: 'ACTIVE' },
      },
    });
  });

  it('leaves reason empty for legacy callers and never writes hash fields itself', async () => {
    const { service, create } = setup();
    await service.record('admin-1', 'report.resolve', 'PlayerReport', 'r1');
    const data = (create.mock.calls[0][0] as { data: Record<string, unknown> })
      .data;
    expect(data.reason).toBeUndefined();
    // Hashing and sequencing belong to the DB trigger so that every insert
    // path is chained and the app cannot forge a link.
    expect(data).not.toHaveProperty('hash');
    expect(data).not.toHaveProperty('prevHash');
    expect(data).not.toHaveProperty('seq');
  });

  it('writes through the caller’s transaction for atomic action + audit', async () => {
    const { service, create } = setup();
    const txCreate = jest.fn().mockResolvedValue({});
    await service.recordIn(
      { adminAuditLog: { create: txCreate } } as never,
      'admin-1',
      'user.suspend',
      'User',
      'u1',
    );
    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });

  it('propagates a failed audit write so the surrounding transaction rolls back', async () => {
    const { service, create } = setup();
    create.mockRejectedValue(new Error('trigger rejected'));
    await expect(
      service.recordIn(
        { adminAuditLog: { create } } as never,
        'a',
        'x',
        'User',
        'u1',
      ),
    ).rejects.toThrow('trigger rejected');
  });

  describe('verifyChain', () => {
    it('reports an intact chain', async () => {
      const { service } = setup(
        jest
          .fn()
          .mockResolvedValue([
            { checked: BigInt(12), legacy: BigInt(3), first_broken_id: null },
          ]),
      );
      await expect(service.verifyChain()).resolves.toEqual({
        checked: 12,
        legacy: 3,
        intact: true,
        firstBrokenId: null,
      });
    });

    it('surfaces the first tampered row', async () => {
      const { service } = setup(
        jest
          .fn()
          .mockResolvedValue([
            { checked: BigInt(4), legacy: BigInt(0), first_broken_id: 'row-5' },
          ]),
      );
      await expect(service.verifyChain()).resolves.toEqual({
        checked: 4,
        legacy: 0,
        intact: false,
        firstBrokenId: 'row-5',
      });
    });

    it('treats an empty log as intact', async () => {
      const { service } = setup(jest.fn().mockResolvedValue([]));
      await expect(service.verifyChain()).resolves.toEqual({
        checked: 0,
        legacy: 0,
        intact: true,
        firstBrokenId: null,
      });
    });
  });
});
