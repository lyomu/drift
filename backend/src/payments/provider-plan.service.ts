import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BillingInterval,
  PaymentPlan,
  Promotion,
  PromotionDiscountType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProviderResolver } from './payment-provider.resolver';

/**
 * Keeps our plans and the hosted provider's plans in step.
 *
 * A hosted provider bills a fixed amount against a mandate: we cannot apply a
 * discount per cycle from our side. So a promotion is not a modifier on a
 * charge, it is a **separate provider plan at the discounted price**, and this
 * service is what mints each one at most once and reuses it afterwards.
 *
 * Every method is inert on a direct provider (the sandbox), so a deployment
 * with no real provider key configured for a plan's currency behaves exactly
 * as it did before either hosted provider existed.
 */
@Injectable()
export class ProviderPlanService {
  private readonly logger = new Logger(ProviderPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderResolver,
  ) {}

  /** Whether this currency currently routes to a real, configured provider. */
  isBillable(currency: string): boolean {
    return this.providers.resolve(currency) !== null;
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
    const provider = this.providers.resolve(plan.currency);
    if (!provider || provider.mode !== 'hosted') return null;

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
        // May come back a different id than existing.providerPlanId — Paddle
        // mints a new price rather than editing amount in place. Whatever
        // comes back is what gets billed against from here on.
        const providerPlanId = await provider.updatePlan(
          existing.providerPlanId,
          {
            name: this.providerPlanName(plan, promotion),
            amountMinor,
            currency: plan.currency,
            interval: this.interval(plan.interval),
          },
        );
        await this.prisma.providerPlan.update({
          where: { id: existing.id },
          data: { providerPlanId, amountMinor, currency: plan.currency },
        });
        return providerPlanId;
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
    const provider = this.providers.resolve(plan.currency);
    if (!provider || provider.mode !== 'hosted') {
      return { synced: 0, failed: 0, attempted: false };
    }

    // Scoped to this plan's current provider: a plan repriced into a
    // different currency after an earlier reprice may have left rows behind
    // for a provider it no longer routes to, and those are no longer this
    // plan's business to sync.
    const rows = await this.prisma.providerPlan.findMany({
      where: { planId: plan.id, provider: provider.name },
      include: { promotion: true },
    });
    let synced = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const amountMinor = this.discountedAmountMinor(plan, row.promotion);
        const providerPlanId = await provider.updatePlan(row.providerPlanId, {
          name: this.providerPlanName(plan, row.promotion),
          amountMinor,
          currency: plan.currency,
          interval: this.interval(plan.interval),
        });
        await this.prisma.providerPlan.update({
          where: { id: row.id },
          data: { providerPlanId, amountMinor, currency: plan.currency },
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

  /** Stop a mandate at the provider that actually issued it. Inert when the
   * mandate was never hosted, or the provider that held it isn't configured. */
  async cancel(input: {
    providerName: string | null;
    providerReference: string | null;
  }): Promise<boolean> {
    if (!input.providerReference) return false;
    const provider = this.providers.byName(input.providerName);
    if (!provider || provider.mode !== 'hosted') return false;
    await provider.cancelSubscription(input.providerReference);
    return true;
  }

  /** Move money back through the provider that took it. Inert when the charge
   * was never hosted, its provider isn't configured, or no per-charge id was
   * ever captured. */
  async refund(input: {
    providerName: string | null;
    providerInvoiceId: string | null;
    amountMinor: number;
    reason: string;
    reasonDetails?: string | null;
  }): Promise<{ reference: string } | null> {
    if (!input.providerInvoiceId) return null;
    const provider = this.providers.byName(input.providerName);
    if (!provider || provider.mode !== 'hosted') return null;
    return provider.refund({
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
