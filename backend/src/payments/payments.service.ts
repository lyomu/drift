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
  PaymentTransactionStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';
import { AddPaymentMethodDto } from './dto/payment-method.dto';
import { PAYMENT_PROVIDER } from './payment-provider';
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
  ) {}

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
    return this.changeSubscription(account.id, BillingAudience.PLAYER, dto);
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
    return this.changeSubscription(account.id, BillingAudience.CLUB, dto);
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
