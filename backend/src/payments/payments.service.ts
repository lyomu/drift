import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BillingAudience,
  BillingInterval,
  BillingInvoiceStatus,
  BillingSubscriptionStatus,
  ClubMembershipStatus,
  ClubRole,
  PaymentPlan,
  PaymentTransactionStatus,
  Prisma,
  Promotion,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';
import { AddPaymentMethodDto } from './dto/payment-method.dto';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER } from './payment-provider';
import { ProviderPlanService } from './provider-plan.service';
import type { PaymentProvider } from './payment-provider';
import {
  toInvoiceDto,
  toPaymentMethodDto,
  toPlanDto,
  toSubscriptionDto,
} from './payments.mapper';

const invoiceInclude = {
  plan: true,
  transaction: { include: { paymentMethod: true } },
} satisfies Prisma.BillingInvoiceInclude;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly config: ConfigService,
    private readonly providerPlans: ProviderPlanService,
  ) {}

  /**
   * Where a hosted provider returns the payer once they are done. The club
   * console reads the outcome from our own record rather than from anything in
   * this URL — the provider's redirect is a convenience, the webhook is the
   * source of truth, and a payer who closes the tab must still end up correct.
   */
  private returnUrl(): string {
    const base = (
      this.config.get<string>('CLUB_ADMIN_URL') ?? 'http://localhost:3010'
    ).replace(/\/+$/, '');
    return `${base}/billing`;
  }

  async playerPlans() {
    return this.listPlans(BillingAudience.PLAYER);
  }

  async playerSummary(userId: string) {
    const account = await this.ensureAccount(
      { userId },
      BillingAudience.PLAYER,
    );
    return this.summary(account.id);
  }

  async playerMethods(userId: string) {
    const account = await this.ensureAccount(
      { userId },
      BillingAudience.PLAYER,
    );
    return this.methods(account.id);
  }

  async addPlayerMethod(userId: string, dto: AddPaymentMethodDto) {
    const account = await this.ensureAccount(
      { userId },
      BillingAudience.PLAYER,
    );
    return this.addMethod(account.id, dto);
  }

  async removePlayerMethod(userId: string, methodId: string) {
    const account = await this.ensureAccount(
      { userId },
      BillingAudience.PLAYER,
    );
    return this.removeMethod(account.id, methodId);
  }

  async changePlayerSubscription(userId: string, dto: ChangeSubscriptionDto) {
    const account = await this.ensureAccount(
      { userId },
      BillingAudience.PLAYER,
    );
    return this.changeSubscription(account.id, BillingAudience.PLAYER, dto, {
      userId,
    });
  }

  async playerInvoices(userId: string) {
    const account = await this.ensureAccount(
      { userId },
      BillingAudience.PLAYER,
    );
    return this.invoices(account.id);
  }

  async playerReceipt(userId: string, invoiceId: string) {
    const account = await this.ensureAccount(
      { userId },
      BillingAudience.PLAYER,
    );
    return this.receipt(account.id, invoiceId);
  }

  async clubBilling(userId: string, clubId: string) {
    await this.assertClubAccess(userId, clubId, [ClubRole.OWNER]);
    const account = await this.ensureAccount({ clubId }, BillingAudience.CLUB);
    const [summary, plans, invoices] = await Promise.all([
      this.summary(account.id),
      this.listPlans(BillingAudience.CLUB),
      this.invoices(account.id),
    ]);
    return { ...summary, plans: plans.plans, invoices: invoices.invoices };
  }

  async addClubMethod(
    userId: string,
    clubId: string,
    dto: AddPaymentMethodDto,
  ) {
    await this.assertClubAccess(userId, clubId, [ClubRole.OWNER]);
    const account = await this.ensureAccount({ clubId }, BillingAudience.CLUB);
    return this.addMethod(account.id, dto);
  }

  async removeClubMethod(userId: string, clubId: string, methodId: string) {
    await this.assertClubAccess(userId, clubId, [ClubRole.OWNER]);
    const account = await this.ensureAccount({ clubId }, BillingAudience.CLUB);
    return this.removeMethod(account.id, methodId);
  }

  async changeClubSubscription(
    userId: string,
    clubId: string,
    dto: ChangeSubscriptionDto,
  ) {
    await this.assertClubAccess(userId, clubId, [ClubRole.OWNER]);
    const account = await this.ensureAccount({ clubId }, BillingAudience.CLUB);
    return this.changeSubscription(account.id, BillingAudience.CLUB, dto, {
      userId,
    });
  }

  async clubReceipt(userId: string, clubId: string, invoiceId: string) {
    await this.assertClubAccess(userId, clubId, [ClubRole.OWNER]);
    const account = await this.ensureAccount({ clubId }, BillingAudience.CLUB);
    return this.receipt(account.id, invoiceId);
  }

  private async listPlans(audience: BillingAudience) {
    const plans = await this.prisma.paymentPlan.findMany({
      where: { audience, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceMinor: 'asc' }],
    });
    return { plans: plans.map(toPlanDto) };
  }

  private async ensureAccount(
    owner: { userId: string } | { clubId: string },
    audience: BillingAudience,
  ) {
    const account =
      'userId' in owner
        ? await this.prisma.billingAccount.upsert({
            where: { userId: owner.userId },
            create: { userId: owner.userId },
            update: {},
          })
        : await this.prisma.billingAccount.upsert({
            where: { clubId: owner.clubId },
            create: { clubId: owner.clubId },
            update: {},
          });

    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { billingAccountId: account.id },
    });
    if (!subscription) {
      const freePlan = await this.prisma.paymentPlan.findFirst({
        where: { audience, isActive: true, priceMinor: 0 },
        orderBy: { sortOrder: 'asc' },
      });
      if (!freePlan) {
        throw new ServiceUnavailableException(
          'Billing plans are not configured for this account.',
        );
      }
      const now = new Date();
      await this.prisma.billingSubscription.upsert({
        where: { billingAccountId: account.id },
        create: {
          billingAccountId: account.id,
          planId: freePlan.id,
          currentPeriodStart: now,
          currentPeriodEnd: this.periodEnd(now, freePlan.interval),
        },
        update: {},
      });
    }
    return account;
  }

  private async summary(billingAccountId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { billingAccountId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new ServiceUnavailableException('Subscription is not available.');
    }
    const methods = await this.prisma.paymentMethod.findMany({
      where: { billingAccountId, removedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return {
      subscription: toSubscriptionDto(subscription),
      paymentMethods: methods.map(toPaymentMethodDto),
      sandbox: subscription.plan.isTest,
      // Lets the console stop offering to store a card on a deployment where
      // the provider collects payment itself. Without it the UI shows a form
      // whose every submission is rejected.
      hostedCheckout: this.provider.mode === 'hosted',
    };
  }

  private async methods(billingAccountId: string) {
    const methods = await this.prisma.paymentMethod.findMany({
      where: { billingAccountId, removedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { paymentMethods: methods.map(toPaymentMethodDto) };
  }

  private async addMethod(billingAccountId: string, dto: AddPaymentMethodDto) {
    // A hosted provider never lets us hold card details, so "add a payment
    // method" has no meaning there: the payer authorises during checkout and
    // the provider keeps the instrument. Saying so plainly beats accepting a
    // brand and last4 that would go nowhere.
    if (this.provider.mode !== 'direct') {
      throw new BadRequestException(
        'This deployment collects payment details during checkout. Choose a plan to continue.',
      );
    }
    const tokenised = await this.provider.createPaymentMethod(dto);
    const method = await this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({
        where: { billingAccountId, removedAt: null, isDefault: true },
        data: { isDefault: false },
      });
      return tx.paymentMethod.create({
        data: {
          billingAccountId,
          type: dto.type,
          provider: tokenised.provider,
          providerToken: tokenised.token,
          brand: tokenised.brand,
          last4: tokenised.last4,
          label: tokenised.label,
          isDefault: true,
        },
      });
    });
    return toPaymentMethodDto(method);
  }

  private async removeMethod(billingAccountId: string, methodId: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id: methodId, billingAccountId, removedAt: null },
    });
    if (!method) throw new NotFoundException('Payment method not found.');

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.update({
        where: { id: method.id },
        data: { removedAt: new Date(), isDefault: false },
      });
      if (method.isDefault) {
        const replacement = await tx.paymentMethod.findFirst({
          where: { billingAccountId, removedAt: null, id: { not: method.id } },
          orderBy: { createdAt: 'desc' },
        });
        if (replacement) {
          await tx.paymentMethod.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    });
    return { removed: true };
  }

  private async changeSubscription(
    billingAccountId: string,
    audience: BillingAudience,
    dto: ChangeSubscriptionDto,
    // Who is paying. A hosted provider needs a real person to bill and to send
    // a receipt to; for a club that is the owner performing the change, since
    // the club itself has no email address of its own.
    payer: { userId: string },
  ) {
    const plan = await this.prisma.paymentPlan.findFirst({
      where: { id: dto.planId, audience, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found.');

    const current = await this.prisma.billingSubscription.findUnique({
      where: { billingAccountId },
    });
    if (
      current?.planId === plan.id &&
      current.status === BillingSubscriptionStatus.ACTIVE
    ) {
      return this.summary(billingAccountId);
    }

    const now = new Date();
    const periodEnd = this.periodEnd(now, plan.interval);
    if (plan.priceMinor === 0) {
      // Downgrading to free has to stop the recurring mandate at the provider,
      // not just in our own tables. Skipping this is how a club that "moved to
      // the free plan" keeps getting charged every month.
      if (this.provider.mode === 'hosted' && current?.providerReference) {
        await this.provider.cancelSubscription(current.providerReference);
      }
      await this.prisma.billingSubscription.upsert({
        where: { billingAccountId },
        create: {
          billingAccountId,
          planId: plan.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planId: plan.id,
          status: BillingSubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          providerReference: null,
        },
      });
      return this.summary(billingAccountId);
    }

    if (this.provider.mode === 'hosted') {
      // Resolved here rather than inside the checkout so an unusable code is a
      // 400 before anything is created at the provider or in our ledger.
      let promotion: Promotion | null = null;
      if (dto.promoCode?.trim()) {
        promotion = await this.prisma.promotion.findUnique({
          where: { code: dto.promoCode.trim().toUpperCase() },
        });
        if (!promotion) {
          throw new NotFoundException('That promotion code was not found.');
        }
        this.providerPlans.assertRedeemable(plan, promotion);
      }
      return this.startHostedCheckout(
        billingAccountId,
        plan,
        payer,
        now,
        periodEnd,
        promotion,
      );
    }

    const method = dto.paymentMethodId
      ? await this.prisma.paymentMethod.findFirst({
          where: {
            id: dto.paymentMethodId,
            billingAccountId,
            removedAt: null,
          },
        })
      : await this.prisma.paymentMethod.findFirst({
          where: { billingAccountId, removedAt: null, isDefault: true },
        });
    if (!method) {
      throw new BadRequestException(
        'Add a payment method before selecting a paid plan.',
      );
    }

    const description = `${plan.name} subscription`;
    const charge = await this.provider.charge({
      providerToken: method.providerToken,
      amountMinor: plan.priceMinor,
      currency: plan.currency,
      description,
    });
    const invoiceNumber = this.invoiceNumber();

    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.billingInvoice.create({
        data: {
          number: invoiceNumber,
          billingAccountId,
          planId: plan.id,
          amountMinor: plan.priceMinor,
          currency: plan.currency,
          status: charge.succeeded
            ? BillingInvoiceStatus.PAID
            : BillingInvoiceStatus.FAILED,
          description,
          periodStart: now,
          periodEnd,
          paidAt: charge.succeeded ? now : null,
        },
      });
      await tx.paymentTransaction.create({
        data: {
          billingAccountId,
          invoiceId: invoice.id,
          paymentMethodId: method.id,
          provider: method.provider,
          providerReference: charge.reference,
          amountMinor: plan.priceMinor,
          currency: plan.currency,
          status: charge.succeeded
            ? PaymentTransactionStatus.SUCCEEDED
            : PaymentTransactionStatus.FAILED,
          failureReason: charge.failureReason,
        },
      });
      if (charge.succeeded) {
        await tx.billingSubscription.upsert({
          where: { billingAccountId },
          create: {
            billingAccountId,
            planId: plan.id,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            providerReference: `sandbox_sub_${randomUUID()}`,
          },
          update: {
            planId: plan.id,
            status: BillingSubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            providerReference: `sandbox_sub_${randomUUID()}`,
          },
        });
      }
    });

    if (!charge.succeeded) {
      throw new HttpException(
        charge.failureReason ?? 'Payment failed. Please retry.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return this.summary(billingAccountId);
  }

  /**
   * Begin a hosted checkout. Nothing is charged here and nothing is granted:
   * this records the intent, asks the provider for a setup link, and hands that
   * link back for the console to redirect to. The subscription only becomes
   * ACTIVE when the webhook confirms payment — granting entitlements on a
   * redirect the payer can abandon is how a product gives itself away.
   */
  private async startHostedCheckout(
    billingAccountId: string,
    plan: PaymentPlan,
    payer: { userId: string },
    now: Date,
    periodEnd: Date,
    promotion: Promotion | null,
  ) {
    if (this.provider.mode !== 'hosted') {
      throw new ServiceUnavailableException('Payments are not configured.');
    }
    const provider = this.provider;

    const user = await this.prisma.user.findUnique({
      where: { id: payer.userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user?.email) {
      throw new BadRequestException(
        'Add an email address to your account before subscribing — the payment provider sends the receipt there.',
      );
    }

    // The provider plan for this (plan, promotion) pair — minted once and
    // reused, because a discount cannot be applied per cycle to a mandate and
    // therefore has to be its own plan at the discounted price.
    const providerPlanId = await this.providerPlans.resolve(plan, promotion);
    if (!providerPlanId) {
      throw new ServiceUnavailableException(
        'The payment provider did not return a plan. No charge was made.',
      );
    }
    const amountMinor = this.providerPlans.discountedAmountMinor(
      plan,
      promotion,
    );

    const account = await this.prisma.billingAccount.findUniqueOrThrow({
      where: { id: billingAccountId },
      select: { providerCustomerId: true },
    });
    let providerCustomerId = account.providerCustomerId;
    if (!providerCustomerId) {
      providerCustomerId = await provider.createCustomer({
        reference: billingAccountId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      await this.prisma.billingAccount.update({
        where: { id: billingAccountId },
        data: { providerCustomerId },
      });
    }

    const invoiceNumber = this.invoiceNumber();
    const description = promotion
      ? `${plan.name} subscription (${promotion.code})`
      : `${plan.name} subscription`;

    // Written before we leave for the provider: a fast payer's webhook can
    // arrive before this request has even finished, and it needs a row to find.
    const invoice = await this.prisma.billingInvoice.create({
      data: {
        number: invoiceNumber,
        billingAccountId,
        planId: plan.id,
        amountMinor,
        currency: plan.currency,
        status: BillingInvoiceStatus.OPEN,
        description,
        periodStart: now,
        periodEnd,
      },
    });

    const started = await provider.startSubscription({
      customerId: providerCustomerId,
      planId: providerPlanId,
      reference: invoiceNumber,
      returnUrl: this.returnUrl(),
    });

    await this.prisma.paymentTransaction.create({
      data: {
        billingAccountId,
        invoiceId: invoice.id,
        provider: provider.name,
        // Namespaced because providerReference is unique across the table and
        // a subscription id and a per-charge invoice id come from different
        // sequences at the provider — unprefixed they could collide.
        providerReference: `sub:${started.providerReference}`,
        amountMinor,
        currency: plan.currency,
        status: PaymentTransactionStatus.PENDING,
      },
    });

    return {
      ...(await this.summary(billingAccountId)),
      checkout: {
        url: started.setupUrl,
        invoiceNumber,
        provider: provider.name,
      },
    };
  }

  /**
   * Apply a payment event from a hosted provider. Called only after the caller
   * has authenticated the webhook — this method trusts its input.
   *
   * Idempotent: providers retry, and a retry of an event we already applied has
   * to be a no-op rather than a second charge record or a second period.
   */
  async applyProviderPaymentEvent(event: {
    state?: string | null;
    invoiceId?: string | null;
    reference?: string | null;
    subscriptionId?: string | null;
    failureReason?: string | null;
  }): Promise<{ applied: boolean; reason?: string }> {
    const state = (event.state ?? '').toUpperCase();

    // Find our invoice: by the reference we handed the provider if it came
    // back, otherwise through the transaction we opened for the subscription.
    let invoice = event.reference
      ? await this.prisma.billingInvoice.findUnique({
          where: { number: event.reference },
        })
      : null;

    if (!invoice && event.subscriptionId) {
      const pending = await this.prisma.paymentTransaction.findUnique({
        where: { providerReference: `sub:${event.subscriptionId}` },
        include: { invoice: true },
      });
      invoice = pending?.invoice ?? null;
    }

    if (!invoice) {
      return { applied: false, reason: 'no matching invoice' };
    }
    if (invoice.status === BillingInvoiceStatus.PAID) {
      return { applied: false, reason: 'already paid' };
    }
    if (state !== 'COMPLETE' && state !== 'FAILED') {
      // PENDING and PROCESSING are progress reports, not outcomes.
      return { applied: false, reason: `state ${state || 'missing'}` };
    }

    const succeeded = state === 'COMPLETE';
    const paidAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.billingInvoice.update({
        where: { id: invoice.id },
        data: {
          status: succeeded
            ? BillingInvoiceStatus.PAID
            : BillingInvoiceStatus.FAILED,
          paidAt: succeeded ? paidAt : null,
        },
      });

      const existing = await tx.paymentTransaction.findUnique({
        where: { invoiceId: invoice.id },
      });
      if (existing) {
        await tx.paymentTransaction.update({
          where: { id: existing.id },
          data: {
            status: succeeded
              ? PaymentTransactionStatus.SUCCEEDED
              : PaymentTransactionStatus.FAILED,
            failureReason: succeeded ? null : (event.failureReason ?? null),
            // The provider's per-charge id, and the only handle a refund can
            // be filed against later. Captured here because this webhook is
            // the one place it is ever offered to us.
            providerInvoiceId: event.invoiceId ?? existing.providerInvoiceId,
          },
        });
      }

      if (succeeded) {
        await tx.billingSubscription.upsert({
          where: { billingAccountId: invoice.billingAccountId },
          create: {
            billingAccountId: invoice.billingAccountId,
            planId: invoice.planId,
            currentPeriodStart: invoice.periodStart,
            currentPeriodEnd: invoice.periodEnd,
            providerReference: event.subscriptionId ?? null,
          },
          update: {
            planId: invoice.planId,
            status: BillingSubscriptionStatus.ACTIVE,
            currentPeriodStart: invoice.periodStart,
            currentPeriodEnd: invoice.periodEnd,
            providerReference: event.subscriptionId ?? null,
          },
        });
      } else {
        // A failed renewal must not silently keep the club on a paid plan.
        await tx.billingSubscription.updateMany({
          where: { billingAccountId: invoice.billingAccountId },
          data: { status: BillingSubscriptionStatus.PAST_DUE },
        });
      }
    });

    return { applied: true };
  }

  private async invoices(billingAccountId: string) {
    const invoices = await this.prisma.billingInvoice.findMany({
      where: { billingAccountId },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { invoices: invoices.map(toInvoiceDto) };
  }

  private async receipt(billingAccountId: string, invoiceId: string) {
    const invoice = await this.prisma.billingInvoice.findFirst({
      where: { id: invoiceId, billingAccountId },
      include: invoiceInclude,
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return { receipt: toInvoiceDto(invoice) };
  }

  private async assertClubAccess(
    userId: string,
    clubId: string,
    roles?: ClubRole[],
  ) {
    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (
      !membership ||
      membership.status !== ClubMembershipStatus.ACTIVE ||
      (roles && !roles.includes(membership.role))
    ) {
      throw new ForbiddenException(
        roles
          ? 'Only the club owner can change billing.'
          : "You don't have access to this club's billing.",
      );
    }
  }

  private periodEnd(start: Date, interval: BillingInterval) {
    const end = new Date(start);
    const day = end.getUTCDate();
    end.setUTCDate(1);
    if (interval === BillingInterval.YEARLY) {
      end.setUTCFullYear(end.getUTCFullYear() + 1);
    } else {
      end.setUTCMonth(end.getUTCMonth() + 1);
    }
    const lastDay = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
    ).getUTCDate();
    end.setUTCDate(Math.min(day, lastDay));
    return end;
  }

  private invoiceNumber() {
    return `DRIFT-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
