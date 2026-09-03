import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  BillingInterval,
  PaymentPlan,
  Promotion,
  PromotionDiscountType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER } from './payment-provider';
import type { PaymentProvider } from './payment-provider';

/**
 * Keeps our plans and the hosted provider's plans in step.
 *
 * A hosted provider bills a fixed amount against a mandate: we cannot apply a
 * discount per cycle from our side. So a promotion is not a modifier on a
 * charge, it is a **separate provider plan at the discounted price**, and this
 * service is what mints each one at most once and reuses it afterwards.
 *
 * Every method is inert on a direct provider (the sandbox), so a deployment
 * with no IntaSend key behaves exactly as it did before.
 */
@Injectable()
export class ProviderPlanService {
  private readonly logger = new Logger(ProviderPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  get hosted(): boolean {
    return this.provider.mode === 'hosted';
  }

  /**
   * What the club is actually charged once a promotion is applied.
   *
   * The discount rounds down, so rounding never favours us over the payer.
   */
  discountedAmountMinor(
    plan: PaymentPlan,
    promotion: Promotion | null,
  ): number {
    if (!promotion) return plan.priceMinor;

    if (promotion.discountType === PromotionDiscountType.PERCENT) {
      const percent = promotion.percentOff ?? 0;
      return Math.max(
        0,
        plan.priceMinor - Math.floor((plan.priceMinor * percent) / 100),
      );
    }

    // A fixed amount is only meaningful in its own currency: applying a KES
    // discount to a USD plan would change the price by a factor of a hundred
    // or more, silently.
    if (promotion.currency && promotion.currency !== plan.currency) {
      throw new BadRequestException(
        `Promotion ${promotion.code} is in ${promotion.currency} and cannot apply to a ${plan.currency} plan.`,
      );
    }
    return Math.max(0, plan.priceMinor - (promotion.amountOffMinor ?? 0));
  }

  /** Rejects a promotion that is inactive, out of window, or for another audience. */
  assertRedeemable(plan: PaymentPlan, promotion: Promotion): void {
    const now = new Date();
    if (!promotion.isActive) {
      throw new BadRequestException('That promotion is no longer active.');
    }
    if (promotion.startsAt > now) {
      throw new BadRequestException('That promotion has not started yet.');
    }
    if (promotion.endsAt && promotion.endsAt < now) {
      throw new BadRequestException('That promotion has expired.');
    }
    if (promotion.audience && promotion.audience !== plan.audience) {
      throw new BadRequestException(
        'That promotion does not apply to this plan.',
      );
    }
    // `maxRedemptions` is deliberately not enforced: nothing records a
    // redemption anywhere, so a check here would be a guess dressed as a rule.
    // Enforcing it needs a redemptions table first.
  }

  /**
   * The provider plan to subscribe against — minted if this (plan, promotion)
   * pair has never been used, and repriced if our terms have moved since.
   */
  async resolve(
    plan: PaymentPlan,
    promotion: Promotion | null,
  ): Promise<string | null> {
    if (this.provider.mode !== 'hosted') return null;
    const provider = this.provider;

    const amountMinor = this.discountedAmountMinor(plan, promotion);
    const existing = await this.prisma.providerPlan.findUnique({
      where: {
        planId_promotionKey_provider: {
          planId: plan.id,
          promotionKey: promotion?.id ?? '',
          provider: provider.name,
        },
      },
    });

    if (existing) {
      if (
        existing.amountMinor !== amountMinor ||
        existing.currency !== plan.currency
      ) {
        await provider.updatePlan(existing.providerPlanId, {
          name: this.providerPlanName(plan, promotion),
          amountMinor,
          currency: plan.currency,
          interval: this.interval(plan.interval),
        });
        await this.prisma.providerPlan.update({
          where: { id: existing.id },
          data: { amountMinor, currency: plan.currency },
        });
      }
      return existing.providerPlanId;
    }

    const providerPlanId = await provider.createPlan({
      name: this.providerPlanName(plan, promotion),
      amountMinor,
      currency: plan.currency,
      interval: this.interval(plan.interval),
    });
    await this.prisma.providerPlan.create({
      data: {
        planId: plan.id,
        promotionId: promotion?.id ?? null,
        promotionKey: promotion?.id ?? '',
        provider: provider.name,
        providerPlanId,
        amountMinor,
        currency: plan.currency,
      },
    });
    return providerPlanId;
  }

  /**
   * Push edited terms onto every provider plan derived from this one — the
   * undiscounted plan and each promotional variant — so a price change made in
   * Platform Admin cannot leave the provider billing the old amount.
   *
   * Returns what it did, for the audit entry. It never throws into the caller:
   * a provider outage must not lose an edit that is already saved, and any row
   * left stale is repriced by `resolve` on the next checkout anyway.
   */
  async syncPlan(
    plan: PaymentPlan,
  ): Promise<{ synced: number; failed: number; attempted: boolean }> {
    if (this.provider.mode !== 'hosted') {
      return { synced: 0, failed: 0, attempted: false };
    }
    const provider = this.provider;

    const rows = await this.prisma.providerPlan.findMany({
      where: { planId: plan.id, provider: provider.name },
      include: { promotion: true },
    });
    let synced = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const amountMinor = this.discountedAmountMinor(plan, row.promotion);
        await provider.updatePlan(row.providerPlanId, {
          name: this.providerPlanName(plan, row.promotion),
          amountMinor,
          currency: plan.currency,
          interval: this.interval(plan.interval),
        });
        await this.prisma.providerPlan.update({
          where: { id: row.id },
          data: { amountMinor, currency: plan.currency },
        });
        synced += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Could not reprice provider plan ${row.providerPlanId} for ${plan.code}: ${(error as Error).message}`,
        );
      }
    }
    return { synced, failed, attempted: true };
  }

  /** Stop a mandate at the provider. Inert when nothing is hosted. */
  async cancel(providerReference: string | null): Promise<boolean> {
    if (this.provider.mode !== 'hosted' || !providerReference) return false;
    await this.provider.cancelSubscription(providerReference);
    return true;
  }

  /** Move money back. Inert when nothing is hosted or no charge id was captured. */
  async refund(input: {
    providerInvoiceId: string | null;
    amountMinor: number;
    reason: string;
    reasonDetails?: string | null;
  }): Promise<{ reference: string } | null> {
    if (this.provider.mode !== 'hosted' || !input.providerInvoiceId) {
      return null;
    }
    return this.provider.refund({
      providerInvoiceId: input.providerInvoiceId,
      amountMinor: input.amountMinor,
      reason: input.reason,
      reasonDetails: input.reasonDetails ?? null,
    });
  }

  private interval(interval: BillingInterval): 'MONTHLY' | 'YEARLY' {
    return interval === BillingInterval.YEARLY ? 'YEARLY' : 'MONTHLY';
  }

  private providerPlanName(
    plan: PaymentPlan,
    promotion: Promotion | null,
  ): string {
    // IntaSend caps a plan name at 32 characters and accepts only
    // alphanumerics, dash, underscore, colon and space — so build it from the
    // codes rather than the display names, and trim to fit.
    const base = promotion ? `${plan.code}-${promotion.code}` : plan.code;
    return base.replace(/[^A-Za-z0-9 :_-]/g, '-').slice(0, 32);
  }
}
