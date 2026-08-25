import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BillingAudience,
  PaymentTransactionStatus,
  Prisma,
  PromotionDiscountType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import {
  DeactivatePromotionDto,
  DeactivateSponsorPlacementDto,
  RefundTransactionDto,
  UpsertPaymentPlanDto,
  UpsertPromotionDto,
  UpsertSponsorPlacementDto,
} from './dto/commercial-admin.dto';

const PLAN_ORDER = [{ audience: 'asc' as const }, { sortOrder: 'asc' as const }, { priceMinor: 'asc' as const }];

const TRANSACTION_INCLUDE = {
  paymentMethod: true,
  billingAccount: {
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      club: { select: { id: true, name: true } },
    },
  },
  invoice: { include: { plan: true } },
} satisfies Prisma.PaymentTransactionInclude;

@Injectable()
export class CommercialAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPlans(query: { audience?: string; status?: string }) {
    const audience = this.enumValue(BillingAudience, query.audience);
    const plans = await this.prisma.paymentPlan.findMany({
      where: {
        ...(audience ? { audience } : {}),
        ...(query.status === 'ACTIVE' ? { isActive: true } : {}),
        ...(query.status === 'INACTIVE' ? { isActive: false } : {}),
      },
      orderBy: PLAN_ORDER,
    });
    const subscriptions = await this.prisma.billingSubscription.groupBy({
      by: ['planId', 'status'],
      _count: { _all: true },
    });
    const usage = new Map<string, Record<string, number>>();
    for (const row of subscriptions) {
      const current = usage.get(row.planId) ?? {};
      current[row.status] = row._count._all;
      usage.set(row.planId, current);
    }
    return { plans: plans.map((plan) => ({ ...plan, subscriptionCounts: usage.get(plan.id) ?? {} })) };
  }

  async createPlan(actorId: string, dto: UpsertPaymentPlanDto) {
    const plan = await this.prisma.paymentPlan.create({ data: this.planData(dto) });
    await this.audit.record(actorId, 'commercial.plan.create', 'PaymentPlan', plan.id, {
      code: plan.code,
      audience: plan.audience,
      priceMinor: plan.priceMinor,
      currency: plan.currency,
    });
    return { plan };
  }

  async updatePlan(actorId: string, planId: string, dto: UpsertPaymentPlanDto) {
    const existing = await this.prisma.paymentPlan.findUnique({ where: { id: planId } });
    if (!existing) throw new NotFoundException('Plan not found.');
    const activeSubscriptions = await this.prisma.billingSubscription.count({
      where: { planId, status: 'ACTIVE' },
    });
    if (activeSubscriptions > 0 && (existing.currency !== dto.currency.toUpperCase() || existing.audience !== dto.audience)) {
      throw new BadRequestException('Plans with active subscriptions cannot change audience or currency.');
    }
    const plan = await this.prisma.paymentPlan.update({
      where: { id: planId },
      data: this.planData(dto),
    });
    await this.audit.record(actorId, 'commercial.plan.update', 'PaymentPlan', planId, {
      previous: {
        code: existing.code,
        name: existing.name,
        priceMinor: existing.priceMinor,
        currency: existing.currency,
        isActive: existing.isActive,
      },
      next: {
        code: plan.code,
        name: plan.name,
        priceMinor: plan.priceMinor,
        currency: plan.currency,
        isActive: plan.isActive,
      },
    });
    return { plan };
  }

  async listPayments(query: {
    status?: string;
    audience?: string;
    currency?: string;
    search?: string;
    take?: number;
    skip?: number;
  }) {
    const status = this.enumValue(PaymentTransactionStatus, query.status);
    const audience = this.enumValue(BillingAudience, query.audience);
    const where: Prisma.PaymentTransactionWhereInput = {
      ...(status ? { status } : {}),
      ...(query.currency ? { currency: query.currency.toUpperCase() } : {}),
      ...(audience ? { invoice: { plan: { audience } } } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { providerReference: { contains: query.search.trim(), mode: 'insensitive' } },
              { failureReason: { contains: query.search.trim(), mode: 'insensitive' } },
              { invoice: { number: { contains: query.search.trim(), mode: 'insensitive' } } },
              { invoice: { description: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [transactions, total, totalsByStatus] = await this.prisma.$transaction([
      this.prisma.paymentTransaction.findMany({
        where,
        include: TRANSACTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: Math.min(query.take ?? 100, 250),
        skip: query.skip ?? 0,
      }),
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.groupBy({
        by: ['currency', 'status'],
        where,
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
    ]);
    const totals = new Map<string, { collectedMinor: number; refundedMinor: number; failedMinor: number; transactions: number }>();
    for (const totalRow of totalsByStatus) {
      const row = totals.get(totalRow.currency) ?? {
        collectedMinor: 0,
        refundedMinor: 0,
        failedMinor: 0,
        transactions: 0,
      };
      row.transactions += totalRow._count._all;
      if (totalRow.status === PaymentTransactionStatus.SUCCEEDED) row.collectedMinor += totalRow._sum.amountMinor ?? 0;
      if (totalRow.status === PaymentTransactionStatus.REFUNDED) row.refundedMinor += totalRow._sum.amountMinor ?? 0;
      if (totalRow.status === PaymentTransactionStatus.FAILED) row.failedMinor += totalRow._sum.amountMinor ?? 0;
      totals.set(totalRow.currency, row);
    }
    return {
      total,
      totalsByCurrency: [...totals.entries()].map(([currency, row]) => ({ currency, ...row })),
      transactions: transactions.map((transaction) => this.transactionDto(transaction)),
    };
  }

  async paymentDetail(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: TRANSACTION_INCLUDE,
    });
    if (!transaction) throw new NotFoundException('Payment transaction not found.');
    return { transaction: this.transactionDto(transaction) };
  }

  async refundTransaction(actorId: string, transactionId: string, dto: RefundTransactionDto) {
    const existing = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { invoice: true },
    });
    if (!existing) throw new NotFoundException('Payment transaction not found.');
    if (existing.status !== PaymentTransactionStatus.SUCCEEDED) {
      throw new BadRequestException('Only succeeded transactions can be marked refunded.');
    }
    const transaction = await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: { status: PaymentTransactionStatus.REFUNDED, failureReason: null },
      include: TRANSACTION_INCLUDE,
    });
    await this.audit.record(actorId, 'commercial.payment.refund', 'PaymentTransaction', transactionId, {
      reason: dto.reason.trim(),
      amountMinor: existing.amountMinor,
      currency: existing.currency,
      invoiceId: existing.invoiceId,
      invoiceNumber: existing.invoice.number,
      providerReference: existing.providerReference,
      providerCall: false,
    });
    return { transaction: this.transactionDto(transaction) };
  }

  async listPromotions(query: { status?: string; audience?: string }) {
    const audience = this.enumValue(BillingAudience, query.audience);
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        ...(audience ? { audience } : {}),
        ...(query.status === 'ACTIVE'
          ? { isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
          : {}),
        ...(query.status === 'EXPIRED'
          ? { OR: [{ isActive: false }, { endsAt: { lte: now } }] }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }],
      take: 250,
    });
    return { promotions: promotions.map((promotion) => ({ ...promotion, state: this.promotionState(promotion, now) })) };
  }

  async createPromotion(actorId: string, dto: UpsertPromotionDto) {
    const promotion = await this.prisma.promotion.create({ data: this.promotionData(dto) });
    await this.audit.record(actorId, 'commercial.promotion.create', 'Promotion', promotion.id, {
      code: promotion.code,
      discountType: promotion.discountType,
    });
    return { promotion: { ...promotion, state: this.promotionState(promotion) } };
  }

  async updatePromotion(actorId: string, promotionId: string, dto: UpsertPromotionDto) {
    const existing = await this.prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!existing) throw new NotFoundException('Promotion not found.');
    const promotion = await this.prisma.promotion.update({
      where: { id: promotionId },
      data: this.promotionData(dto),
    });
    await this.audit.record(actorId, 'commercial.promotion.update', 'Promotion', promotionId, {
      previous: { code: existing.code, isActive: existing.isActive, endsAt: existing.endsAt },
      next: { code: promotion.code, isActive: promotion.isActive, endsAt: promotion.endsAt },
    });
    return { promotion: { ...promotion, state: this.promotionState(promotion) } };
  }

  async deactivatePromotion(actorId: string, promotionId: string, dto: DeactivatePromotionDto) {
    const existing = await this.prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!existing) throw new NotFoundException('Promotion not found.');
    const promotion = await this.prisma.promotion.update({
      where: { id: promotionId },
      data: { isActive: false },
    });
    await this.audit.record(actorId, 'commercial.promotion.deactivate', 'Promotion', promotionId, {
      code: promotion.code,
      reason: dto.reason.trim(),
    });
    return { promotion: { ...promotion, state: this.promotionState(promotion) } };
  }

  async listSponsorPlacements(query: { state?: string; placementKey?: string }) {
    const placements = await this.prisma.sponsorPlacement.findMany({
      where: {
        ...(query.placementKey ? { placementKey: { contains: query.placementKey.trim(), mode: 'insensitive' } } : {}),
      },
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }],
      take: 250,
    });
    const now = new Date();
    return {
      placements: placements
        .map((placement) => ({ ...placement, state: this.sponsorState(placement, now) }))
        .filter((placement) => !query.state || placement.state === query.state),
    };
  }

  async createSponsorPlacement(actorId: string, dto: UpsertSponsorPlacementDto) {
    const placement = await this.prisma.sponsorPlacement.create({ data: this.sponsorData(dto) });
    await this.audit.record(actorId, 'commercial.sponsor.create', 'SponsorPlacement', placement.id, {
      sponsorName: placement.sponsorName,
      placementKey: placement.placementKey,
    });
    return { placement: { ...placement, state: this.sponsorState(placement) } };
  }

  async updateSponsorPlacement(actorId: string, placementId: string, dto: UpsertSponsorPlacementDto) {
    const existing = await this.prisma.sponsorPlacement.findUnique({ where: { id: placementId } });
    if (!existing) throw new NotFoundException('Sponsor placement not found.');
    const placement = await this.prisma.sponsorPlacement.update({
      where: { id: placementId },
      data: this.sponsorData(dto),
    });
    await this.audit.record(actorId, 'commercial.sponsor.update', 'SponsorPlacement', placementId, {
      previous: { sponsorName: existing.sponsorName, isActive: existing.isActive },
      next: { sponsorName: placement.sponsorName, isActive: placement.isActive },
    });
    return { placement: { ...placement, state: this.sponsorState(placement) } };
  }

  async deactivateSponsorPlacement(actorId: string, placementId: string, dto: DeactivateSponsorPlacementDto) {
    const existing = await this.prisma.sponsorPlacement.findUnique({ where: { id: placementId } });
    if (!existing) throw new NotFoundException('Sponsor placement not found.');
    const placement = await this.prisma.sponsorPlacement.update({
      where: { id: placementId },
      data: { isActive: false, deactivatedAt: new Date() },
    });
    await this.audit.record(actorId, 'commercial.sponsor.deactivate', 'SponsorPlacement', placementId, {
      sponsorName: placement.sponsorName,
      reason: dto.reason.trim(),
    });
    return { placement: { ...placement, state: this.sponsorState(placement) } };
  }

  private planData(dto: UpsertPaymentPlanDto) {
    return {
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      audience: dto.audience,
      priceMinor: dto.priceMinor,
      currency: dto.currency.trim().toUpperCase(),
      interval: dto.interval,
      entitlements: (dto.entitlements ?? []).map((item) => item.trim()).filter(Boolean),
      isActive: dto.isActive,
      isTest: dto.isTest ?? false,
      sortOrder: dto.sortOrder ?? 0,
    };
  }

  private promotionData(dto: UpsertPromotionDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Promotion end date must be after the start date.');
    }
    if (dto.discountType === PromotionDiscountType.PERCENT && !dto.percentOff) {
      throw new BadRequestException('Percent promotions require a percent value.');
    }
    if (dto.discountType === PromotionDiscountType.AMOUNT && (!dto.amountOffMinor || !dto.currency)) {
      throw new BadRequestException('Amount promotions require an amount and currency.');
    }
    return {
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      audience: dto.audience ?? null,
      discountType: dto.discountType,
      percentOff: dto.discountType === PromotionDiscountType.PERCENT ? dto.percentOff ?? null : null,
      amountOffMinor: dto.discountType === PromotionDiscountType.AMOUNT ? dto.amountOffMinor ?? null : null,
      currency: dto.discountType === PromotionDiscountType.AMOUNT ? dto.currency!.trim().toUpperCase() : null,
      startsAt,
      endsAt,
      maxRedemptions: dto.maxRedemptions ?? null,
      isActive: dto.isActive,
    };
  }

  private sponsorData(dto: UpsertSponsorPlacementDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Placement end date must be after the start date.');
    }
    return {
      name: dto.name.trim(),
      sponsorName: dto.sponsorName.trim(),
      placementKey: dto.placementKey.trim(),
      destinationUrl: dto.destinationUrl?.trim() || null,
      imageUrl: dto.imageUrl?.trim() || null,
      startsAt,
      endsAt,
      isActive: dto.isActive,
      deactivatedAt: dto.isActive ? null : new Date(),
    };
  }

  private promotionState(promotion: { isActive: boolean; endsAt: Date | null }, now = new Date()) {
    return promotion.isActive && (!promotion.endsAt || promotion.endsAt > now) ? 'ACTIVE' : 'EXPIRED';
  }

  private sponsorState(placement: { isActive: boolean; startsAt: Date; endsAt: Date | null }, now = new Date()) {
    if (!placement.isActive || (placement.endsAt && placement.endsAt <= now)) return 'ENDED';
    if (placement.startsAt > now) return 'SCHEDULED';
    return 'ACTIVE';
  }

  private transactionDto(transaction: Prisma.PaymentTransactionGetPayload<{ include: typeof TRANSACTION_INCLUDE }>) {
    const owner = transaction.billingAccount.user
      ? {
          type: 'PLAYER' as const,
          id: transaction.billingAccount.user.id,
          name: [transaction.billingAccount.user.firstName, transaction.billingAccount.user.lastName].filter(Boolean).join(' ') || transaction.billingAccount.user.email,
          email: transaction.billingAccount.user.email,
        }
      : transaction.billingAccount.club
        ? {
            type: 'CLUB' as const,
            id: transaction.billingAccount.club.id,
            name: transaction.billingAccount.club.name,
            email: null,
          }
        : { type: 'UNKNOWN' as const, id: null, name: 'Unknown billing account', email: null };
    return {
      id: transaction.id,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      status: transaction.status,
      provider: transaction.provider,
      providerReference: transaction.providerReference,
      failureReason: transaction.failureReason,
      createdAt: transaction.createdAt,
      paymentMethodLabel: transaction.paymentMethod?.label ?? 'Removed method',
      owner,
      invoice: {
        id: transaction.invoice.id,
        number: transaction.invoice.number,
        status: transaction.invoice.status,
        description: transaction.invoice.description,
        periodStart: transaction.invoice.periodStart,
        periodEnd: transaction.invoice.periodEnd,
        paidAt: transaction.invoice.paidAt,
        plan: {
          id: transaction.invoice.plan.id,
          name: transaction.invoice.plan.name,
          audience: transaction.invoice.plan.audience,
        },
      },
    };
  }

  private enumValue<T extends Record<string, string>>(values: T, value?: string) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(values).includes(normalized)
      ? (normalized as T[keyof T])
      : undefined;
  }
}
