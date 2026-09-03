import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClubMembershipStatus, ClubRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import type { PaymentProvider } from './payment-provider';

/**
 * Focused on the two things that would actually hurt if they regressed:
 * cross-account access (can one user reach another's methods, invoices or a
 * club's billing?) and the club-billing role gate. The scoping is correct
 * today — these lock it in.
 */

type MockPrisma = {
  billingAccount: { upsert: jest.Mock };
  billingSubscription: { findUnique: jest.Mock; upsert: jest.Mock };
  paymentPlan: { findFirst: jest.Mock; findMany: jest.Mock };
  paymentMethod: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  billingInvoice: { findFirst: jest.Mock; findMany: jest.Mock };
  clubMembership: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  return {
    billingAccount: { upsert: jest.fn().mockResolvedValue({ id: 'acct-1' }) },
    billingSubscription: {
      findUnique: jest.fn().mockResolvedValue({ id: 'sub-1', plan: {} }),
      upsert: jest.fn(),
    },
    paymentPlan: { findFirst: jest.fn(), findMany: jest.fn() },
    paymentMethod: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    billingInvoice: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    clubMembership: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
}

const provider: PaymentProvider = {
  mode: 'direct',
  name: 'SANDBOX',
  createPaymentMethod: jest.fn(),
  charge: jest.fn(),
};

// Only CLUB_ADMIN_URL is read, and only on the hosted checkout path
// these specs do not exercise; a stub keeps the constructor honest
// without pulling in the whole config module.
const config = { get: jest.fn().mockReturnValue(undefined) };

describe('PaymentsService', () => {
  let prisma: MockPrisma;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new PaymentsService(
      prisma as unknown as PrismaService,
      provider,
      config as unknown as ConfigService,
    );
  });

  describe('removePlayerMethod', () => {
    it('scopes the lookup to the caller’s own billing account', async () => {
      prisma.paymentMethod.findFirst.mockResolvedValue(null);

      await expect(
        service.removePlayerMethod(
          'user-1',
          'method-belonging-to-someone-else',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      // The guard is the query itself — billingAccountId must be part of the
      // where clause, not checked after the fact.
      expect(prisma.paymentMethod.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'method-belonging-to-someone-else',
            billingAccountId: 'acct-1',
          }),
        }),
      );
    });

    it('ignores an already-removed method', async () => {
      prisma.paymentMethod.findFirst.mockResolvedValue(null);
      await expect(
        service.removePlayerMethod('user-1', 'method-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.paymentMethod.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ removedAt: null }),
        }),
      );
    });
  });

  describe('playerReceipt', () => {
    it('will not return another account’s invoice', async () => {
      prisma.billingInvoice.findFirst.mockResolvedValue(null);

      await expect(
        service.playerReceipt('user-1', 'someone-elses-invoice'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.billingInvoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'someone-elses-invoice',
            billingAccountId: 'acct-1',
          }),
        }),
      );
    });
  });

  describe('club billing access', () => {
    it('rejects a non-member outright', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue(null);
      await expect(
        service.clubBilling('user-1', 'club-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an owner whose membership is no longer ACTIVE', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        role: ClubRole.OWNER,
        status: ClubMembershipStatus.SUSPENDED,
      });
      await expect(
        service.clubBilling('user-1', 'club-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([ClubRole.ADMIN, ClubRole.COACH, ClubRole.READ_ONLY])(
      'rejects an active %s — club billing is owner-only, reads included',
      async (role) => {
        prisma.clubMembership.findUnique.mockResolvedValue({
          role,
          status: ClubMembershipStatus.ACTIVE,
        });
        await expect(
          service.clubBilling('user-1', 'club-1'),
        ).rejects.toBeInstanceOf(ForbiddenException);
      },
    );

    it('restricts changing a club subscription to the OWNER', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        role: ClubRole.ADMIN,
        status: ClubMembershipStatus.ACTIVE,
      });

      await expect(
        service.changeClubSubscription('user-1', 'club-1', {
          planId: 'plan-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('will not remove a club payment method for a non-owner', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        role: ClubRole.COACH,
        status: ClubMembershipStatus.ACTIVE,
      });

      await expect(
        service.removeClubMethod('user-1', 'club-1', 'method-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
