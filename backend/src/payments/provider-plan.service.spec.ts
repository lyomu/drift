import { BadRequestException } from '@nestjs/common';
import {
  BillingAudience,
  BillingInterval,
  PaymentPlan,
  Promotion,
  PromotionDiscountType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PaymentProvider } from './payment-provider';
import { ProviderPlanService } from './provider-plan.service';

function plan(overrides: Partial<PaymentPlan> = {}): PaymentPlan {
  return {
    id: 'plan-1',
    code: 'CLUB_PRO',
    name: 'Club Pro',
    description: null,
    audience: BillingAudience.CLUB,
    priceMinor: 250_000,
    currency: 'KES',
    interval: BillingInterval.MONTHLY,
    entitlements: [],
    isActive: true,
    isTest: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PaymentPlan;
}

function promo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    code: 'SAVE20',
    name: 'Save 20',
    description: null,
    audience: null,
    discountType: PromotionDiscountType.PERCENT,
    percentOff: 20,
    amountOffMinor: null,
    currency: null,
    startsAt: new Date(Date.now() - 60_000),
    endsAt: null,
    maxRedemptions: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Promotion;
}

function hostedProvider() {
  return {
    mode: 'hosted' as const,
    name: 'INTASEND',
    createPlan: jest.fn().mockResolvedValue('PLAN_REMOTE'),
    updatePlan: jest.fn().mockResolvedValue(undefined),
    createCustomer: jest.fn(),
    startSubscription: jest.fn(),
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
    refund: jest.fn().mockResolvedValue({ reference: 'CHARGEBACK1' }),
  };
}

function mockPrisma() {
  return {
    providerPlan: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function build(provider: PaymentProvider) {
  const prisma = mockPrisma();
  const service = new ProviderPlanService(
    prisma as unknown as PrismaService,
    provider,
  );
  return { prisma, service };
}

describe('ProviderPlanService', () => {
  describe('discountedAmountMinor', () => {
    it('applies a percentage discount', () => {
      const { service } = build(hostedProvider());
      expect(service.discountedAmountMinor(plan(), promo())).toBe(200_000);
    });

    it('rounds the discount down, never against the payer', () => {
      // 999 minor units at 33% is 329.67 off. Rounding the *discount* down
      // charges 670 rather than 669 — the payer is never charged less than the
      // arithmetic allows, and never more than the advertised price.
      const { service } = build(hostedProvider());
      const amount = service.discountedAmountMinor(
        plan({ priceMinor: 999 }),
        promo({ percentOff: 33 }),
      );
      expect(amount).toBe(670);
    });

    it('applies a fixed amount discount', () => {
      const { service } = build(hostedProvider());
      const amount = service.discountedAmountMinor(
        plan(),
        promo({
          discountType: PromotionDiscountType.AMOUNT,
          percentOff: null,
          amountOffMinor: 50_000,
          currency: 'KES',
        }),
      );
      expect(amount).toBe(200_000);
    });

    it('refuses a fixed discount in a different currency', () => {
      // Subtracting a USD amount from a KES price would change what the club
      // pays by two orders of magnitude, silently.
      const { service } = build(hostedProvider());
      expect(() =>
        service.discountedAmountMinor(
          plan({ currency: 'KES' }),
          promo({
            discountType: PromotionDiscountType.AMOUNT,
            percentOff: null,
            amountOffMinor: 500,
            currency: 'USD',
          }),
        ),
      ).toThrow(BadRequestException);
    });

    it('never returns a negative price', () => {
      const { service } = build(hostedProvider());
      const amount = service.discountedAmountMinor(
        plan({ priceMinor: 100 }),
        promo({
          discountType: PromotionDiscountType.AMOUNT,
          percentOff: null,
          amountOffMinor: 999_999,
          currency: 'KES',
        }),
      );
      expect(amount).toBe(0);
    });
  });

  describe('assertRedeemable', () => {
    const cases: Array<[string, Partial<Promotion>]> = [
      ['inactive', { isActive: false }],
      ['not started', { startsAt: new Date(Date.now() + 86_400_000) }],
      ['expired', { endsAt: new Date(Date.now() - 60_000) }],
      ['for another audience', { audience: BillingAudience.PLAYER }],
    ];

    it.each(cases)('rejects a promotion that is %s', (_label, overrides) => {
      const { service } = build(hostedProvider());
      expect(() =>
        service.assertRedeemable(plan(), promo(overrides)),
      ).toThrow(BadRequestException);
    });

    it('accepts a live promotion for the right audience', () => {
      const { service } = build(hostedProvider());
      expect(() =>
        service.assertRedeemable(plan(), promo({ audience: BillingAudience.CLUB })),
      ).not.toThrow();
    });
  });

  describe('resolve', () => {
    it('mints a provider plan once and records the discriminator', async () => {
      const provider = hostedProvider();
      const { prisma, service } = build(provider);

      const id = await service.resolve(plan(), promo());

      expect(id).toBe('PLAN_REMOTE');
      expect(provider.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({ amountMinor: 200_000, currency: 'KES' }),
      );
      // Null promotions collapse to '' so the unique index actually constrains
      // the undiscounted plan — Postgres treats NULLs as distinct.
      expect(prisma.providerPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ promotionKey: 'promo-1' }),
        }),
      );
    });

    it('uses an empty discriminator for the undiscounted plan', async () => {
      const provider = hostedProvider();
      const { prisma, service } = build(provider);

      await service.resolve(plan(), null);

      expect(prisma.providerPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ promotionKey: '', promotionId: null }),
        }),
      );
    });

    it('reuses an existing provider plan rather than minting a duplicate', async () => {
      const provider = hostedProvider();
      const { prisma, service } = build(provider);
      prisma.providerPlan.findUnique.mockResolvedValue({
        id: 'row-1',
        providerPlanId: 'PLAN_EXISTING',
        amountMinor: 250_000,
        currency: 'KES',
      });

      const id = await service.resolve(plan(), null);

      expect(id).toBe('PLAN_EXISTING');
      expect(provider.createPlan).not.toHaveBeenCalled();
      expect(provider.updatePlan).not.toHaveBeenCalled();
    });

    it('reprices an existing provider plan when our terms have moved', async () => {
      const provider = hostedProvider();
      const { prisma, service } = build(provider);
      prisma.providerPlan.findUnique.mockResolvedValue({
        id: 'row-1',
        providerPlanId: 'PLAN_EXISTING',
        amountMinor: 100_000,
        currency: 'KES',
      });

      await service.resolve(plan(), null);

      expect(provider.updatePlan).toHaveBeenCalledWith(
        'PLAN_EXISTING',
        expect.objectContaining({ amountMinor: 250_000 }),
      );
    });

    it('is inert on a direct provider', async () => {
      const direct = {
        mode: 'direct' as const,
        name: 'SANDBOX',
        createPaymentMethod: jest.fn(),
        charge: jest.fn(),
      };
      const { prisma, service } = build(direct);

      await expect(service.resolve(plan(), null)).resolves.toBeNull();
      expect(prisma.providerPlan.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('syncPlan', () => {
    it('reprices the base plan and every promotional variant', async () => {
      const provider = hostedProvider();
      const { prisma, service } = build(provider);
      prisma.providerPlan.findMany.mockResolvedValue([
        { id: 'r1', providerPlanId: 'P_BASE', promotion: null },
        { id: 'r2', providerPlanId: 'P_PROMO', promotion: promo() },
      ]);

      const result = await service.syncPlan(plan({ priceMinor: 300_000 }));

      expect(result).toEqual({ synced: 2, failed: 0, attempted: true });
      expect(provider.updatePlan).toHaveBeenCalledWith(
        'P_BASE',
        expect.objectContaining({ amountMinor: 300_000 }),
      );
      expect(provider.updatePlan).toHaveBeenCalledWith(
        'P_PROMO',
        expect.objectContaining({ amountMinor: 240_000 }),
      );
    });

    it('counts a failure instead of throwing, so a saved edit is never lost', async () => {
      const provider = hostedProvider();
      provider.updatePlan.mockRejectedValue(new Error('provider down'));
      const { prisma, service } = build(provider);
      prisma.providerPlan.findMany.mockResolvedValue([
        { id: 'r1', providerPlanId: 'P_BASE', promotion: null },
      ]);

      await expect(service.syncPlan(plan())).resolves.toEqual({
        synced: 0,
        failed: 1,
        attempted: true,
      });
    });
  });

  describe('refund', () => {
    it('calls the provider when a charge id was captured', async () => {
      const provider = hostedProvider();
      const { service } = build(provider);

      const result = await service.refund({
        providerInvoiceId: 'BRZKGPR',
        amountMinor: 250_000,
        reason: 'Duplicate charge',
      });

      expect(result).toEqual({ reference: 'CHARGEBACK1' });
      expect(provider.refund).toHaveBeenCalledWith(
        expect.objectContaining({ providerInvoiceId: 'BRZKGPR' }),
      );
    });

    it('returns null when no charge id exists, so the caller can say so', async () => {
      // A transaction predating the webhook that carries the id can only ever
      // be marked refunded in our own ledger.
      const provider = hostedProvider();
      const { service } = build(provider);

      await expect(
        service.refund({
          providerInvoiceId: null,
          amountMinor: 100,
          reason: 'x',
        }),
      ).resolves.toBeNull();
      expect(provider.refund).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('stops the mandate and reports that it did', async () => {
      const provider = hostedProvider();
      const { service } = build(provider);

      await expect(service.cancel('SUB1')).resolves.toBe(true);
      expect(provider.cancelSubscription).toHaveBeenCalledWith('SUB1');
    });

    it('reports false when there is no mandate to stop', async () => {
      const provider = hostedProvider();
      const { service } = build(provider);

      await expect(service.cancel(null)).resolves.toBe(false);
      expect(provider.cancelSubscription).not.toHaveBeenCalled();
    });
  });
});
