import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AccountStatus,
  BillingSubscriptionStatus,
  MatchState,
  PaymentTransactionStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { PlatformTelemetryService } from './platform-telemetry.service';

type BucketUnit = 'day' | 'week' | 'month';
type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

const FINISHED_MATCH_STATES: MatchState[] = [
  MatchState.COMPLETED,
  MatchState.WALKOVER,
  MatchState.RETIRED,
];

const CONFIRMED_MATCH_STATES: MatchState[] = [
  MatchState.SCHEDULED,
  MatchState.RESCHEDULED,
  ...FINISHED_MATCH_STATES,
  MatchState.DISPUTED,
];

@Injectable()
export class PlatformAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly telemetry: PlatformTelemetryService,
  ) {}

  async overview(from?: string, to?: string) {
    const range = this.parseRange(from, to);
    const date = this.dateFilter(range);
    const [
      players,
      activePlayers,
      newPlayers,
      onboardingCompletions,
      finishedMatches,
      activeSubscriptions,
      revenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { accountStatus: AccountStatus.ACTIVE } }),
      this.prisma.user.count({ where: { createdAt: date } }),
      this.prisma.user.count({ where: { onboardingCompletedAt: date } }),
      this.prisma.match.count({
        where: { state: { in: FINISHED_MATCH_STATES }, updatedAt: date },
      }),
      this.prisma.billingSubscription.count({
        where: { status: BillingSubscriptionStatus.ACTIVE },
      }),
      this.prisma.paymentTransaction.groupBy({
        by: ['currency'],
        where: { status: PaymentTransactionStatus.SUCCEEDED, createdAt: date },
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
    ]);

    return {
      period: this.serializeRange(range),
      metrics: {
        players,
        activePlayers,
        newPlayers,
        onboardingCompletions,
        finishedMatches,
        activeSubscriptions,
        revenue: revenue.map((row) => ({
          currency: row.currency,
          amountMinor: row._sum.amountMinor ?? 0,
          transactions: row._count._all,
        })),
      },
    };
  }

  async markets(from?: string, to?: string) {
    const range = this.parseRange(from, to);
    const profiles = await this.prisma.user.findMany({
      where: {
        tennisProfile: { is: { generalLocation: { not: null } } },
      },
      select: {
        id: true,
        accountStatus: true,
        createdAt: true,
        onboardingCompletedAt: true,
        tennisProfile: { select: { generalLocation: true } },
      },
    });

    const userMarket = new Map<string, string>();
    const markets = new Map<
      string,
      {
        name: string;
        playerIds: Set<string>;
        activePlayers: number;
        newPlayers: number;
        onboardedPlayers: number;
        matchIds: Set<string>;
        completedMatchIds: Set<string>;
      }
    >();

    for (const profile of profiles) {
      const name = profile.tennisProfile?.generalLocation?.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      const market = markets.get(key) ?? {
        name,
        playerIds: new Set<string>(),
        activePlayers: 0,
        newPlayers: 0,
        onboardedPlayers: 0,
        matchIds: new Set<string>(),
        completedMatchIds: new Set<string>(),
      };
      market.playerIds.add(profile.id);
      if (profile.accountStatus === AccountStatus.ACTIVE) market.activePlayers += 1;
      if (this.inRange(profile.createdAt, range)) market.newPlayers += 1;
      if (profile.onboardingCompletedAt) market.onboardedPlayers += 1;
      markets.set(key, market);
      userMarket.set(profile.id, key);
    }

    const playerIds = [...userMarket.keys()];
    if (playerIds.length > 0) {
      const participations = await this.prisma.matchParticipant.findMany({
        where: {
          userId: { in: playerIds },
          match: { createdAt: this.dateFilter(range) },
        },
        select: { userId: true, match: { select: { id: true, state: true } } },
      });
      for (const participation of participations) {
        const key = userMarket.get(participation.userId);
        const market = key ? markets.get(key) : undefined;
        if (!market) continue;
        market.matchIds.add(participation.match.id);
        if (FINISHED_MATCH_STATES.includes(participation.match.state)) {
          market.completedMatchIds.add(participation.match.id);
        }
      }
    }

    return {
      period: this.serializeRange(range),
      dimension: 'Player profile general location',
      markets: [...markets.values()]
        .map((market) => ({
          name: market.name,
          players: market.playerIds.size,
          activePlayers: market.activePlayers,
          newPlayers: market.newPlayers,
          onboardingRate:
            market.playerIds.size === 0
              ? 0
              : Number(((market.onboardedPlayers / market.playerIds.size) * 100).toFixed(1)),
          matches: market.matchIds.size,
          completedMatches: market.completedMatchIds.size,
        }))
        .sort((a, b) => b.players - a.players || a.name.localeCompare(b.name)),
    };
  }

  async growth(from?: string, to?: string) {
    const range = this.parseRange(from, to);
    const date = this.dateFilter(range);
    const unit = this.bucketUnit(range);
    const [users, assessmentSessions, connections, matches] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [{ createdAt: date }, { onboardingCompletedAt: date }],
        },
        select: {
          id: true,
          createdAt: true,
          onboardingCompletedAt: true,
          matchParticipations: {
            where: { match: { state: { in: FINISHED_MATCH_STATES } } },
            select: { id: true },
            take: 1,
          },
        },
      }),
      this.prisma.assessmentSession.findMany({
        where: { startedAt: date },
        select: { startedAt: true, completedAt: true, status: true },
      }),
      this.prisma.connection.findMany({
        where: { createdAt: date },
        select: { createdAt: true, status: true, respondedAt: true },
      }),
      this.prisma.match.findMany({
        where: { createdAt: date },
        select: { createdAt: true, state: true },
      }),
    ]);

    const registeredUsers = users.filter((user) => this.inRange(user.createdAt, range));
    const series = this.emptySeries(range, unit).map((bucket) => ({
      ...bucket,
      registrations: 0,
      onboardingCompletions: 0,
      challenges: 0,
      completedMatches: 0,
    }));
    const byKey = new Map(series.map((bucket) => [bucket.key, bucket]));

    for (const user of users) {
      if (this.inRange(user.createdAt, range)) {
        const bucket = byKey.get(this.bucketKey(user.createdAt, unit));
        if (bucket) bucket.registrations += 1;
      }
      if (user.onboardingCompletedAt && this.inRange(user.onboardingCompletedAt, range)) {
        const bucket = byKey.get(this.bucketKey(user.onboardingCompletedAt, unit));
        if (bucket) bucket.onboardingCompletions += 1;
      }
    }
    for (const match of matches) {
      const bucket = byKey.get(this.bucketKey(match.createdAt, unit));
      if (!bucket) continue;
      bucket.challenges += 1;
      if (FINISHED_MATCH_STATES.includes(match.state)) bucket.completedMatches += 1;
    }

    const cohorts = new Map<
      string,
      { cohort: string; registered: number; onboarded: number; playedMatch: number }
    >();
    for (const user of registeredUsers) {
      const key = this.bucketKey(user.createdAt, unit);
      const cohort = cohorts.get(key) ?? {
        cohort: key,
        registered: 0,
        onboarded: 0,
        playedMatch: 0,
      };
      cohort.registered += 1;
      if (user.onboardingCompletedAt) cohort.onboarded += 1;
      if (user.matchParticipations.length > 0) cohort.playedMatch += 1;
      cohorts.set(key, cohort);
    }

    const funnel = (
      id: string,
      name: string,
      steps: { name: string; count: number; definition: string }[],
    ) => ({
      id,
      name,
      steps: steps.map((step, index) => ({
        ...step,
        conversionRate:
          index === 0 || steps[index - 1].count === 0
            ? index === 0
              ? 100
              : 0
            : Number(((step.count / steps[index - 1].count) * 100).toFixed(1)),
      })),
    });

    return {
      period: this.serializeRange(range),
      bucketUnit: unit,
      coverage:
        'Lifecycle milestones are derived from authoritative persisted timestamps and state transitions; view/open telemetry is not yet stored.',
      series,
      funnels: [
        funnel('registration', 'Registration to onboarding', [
          {
            name: 'Registered',
            count: registeredUsers.length,
            definition: 'Accounts created during the selected period.',
          },
          {
            name: 'Onboarding completed',
            count: registeredUsers.filter((user) => user.onboardingCompletedAt).length,
            definition: 'Those same accounts with an onboarding completion timestamp.',
          },
        ]),
        funnel('assessment', 'Assessment completion', [
          {
            name: 'Assessment started',
            count: assessmentSessions.length,
            definition: 'Tennis assessment sessions started during the selected period.',
          },
          {
            name: 'Assessment completed',
            count: assessmentSessions.filter((session) => session.completedAt).length,
            definition: 'Those sessions with a recorded completion timestamp.',
          },
        ]),
        funnel('connections', 'Connection requests', [
          {
            name: 'Request sent',
            count: connections.length,
            definition: 'Connection requests created during the selected period.',
          },
          {
            name: 'Accepted',
            count: connections.filter((connection) => connection.status === 'ACCEPTED').length,
            definition: 'Those requests whose current persisted state is accepted.',
          },
        ]),
        funnel('matches', 'Challenge to completed match', [
          {
            name: 'Challenge sent',
            count: matches.length,
            definition: 'Matches proposed during the selected period.',
          },
          {
            name: 'Confirmed',
            count: matches.filter((match) => CONFIRMED_MATCH_STATES.includes(match.state)).length,
            definition: 'Challenges now scheduled or progressed beyond scheduling.',
          },
          {
            name: 'Completed',
            count: matches.filter((match) => FINISHED_MATCH_STATES.includes(match.state)).length,
            definition: 'Matches completed, retired, or recorded as a walkover.',
          },
        ]),
      ],
      cohorts: [...cohorts.values()]
        .sort((a, b) => a.cohort.localeCompare(b.cohort))
        .map((cohort) => ({
          ...cohort,
          onboardingRate:
            cohort.registered === 0
              ? 0
              : Number(((cohort.onboarded / cohort.registered) * 100).toFixed(1)),
          matchActivationRate:
            cohort.registered === 0
              ? 0
              : Number(((cohort.playedMatch / cohort.registered) * 100).toFixed(1)),
        })),
    };
  }

  async revenue(from?: string, to?: string) {
    const range = this.parseRange(from, to);
    const date = this.dateFilter(range);
    const unit = this.bucketUnit(range);
    const [transactions, invoiceStates, subscriptionStates] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { createdAt: date },
        select: {
          id: true,
          provider: true,
          providerReference: true,
          amountMinor: true,
          currency: true,
          status: true,
          failureReason: true,
          createdAt: true,
          invoice: {
            select: {
              number: true,
              description: true,
              plan: { select: { name: true, audience: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.billingInvoice.groupBy({
        by: ['status'],
        where: { createdAt: date },
        _count: { _all: true },
      }),
      this.prisma.billingSubscription.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const currencies = new Map<
      string,
      { currency: string; collectedMinor: number; refundedMinor: number; failedMinor: number; transactions: number }
    >();
    const sourceLines = new Map<
      string,
      { source: string; audience: string; currency: string; collectedMinor: number; refundedMinor: number; transactions: number }
    >();
    const trend = new Map<
      string,
      { key: string; currency: string; collectedMinor: number; refundedMinor: number }
    >();

    for (const transaction of transactions) {
      const currency = currencies.get(transaction.currency) ?? {
        currency: transaction.currency,
        collectedMinor: 0,
        refundedMinor: 0,
        failedMinor: 0,
        transactions: 0,
      };
      currency.transactions += 1;
      if (transaction.status === PaymentTransactionStatus.SUCCEEDED) {
        currency.collectedMinor += transaction.amountMinor;
      } else if (transaction.status === PaymentTransactionStatus.REFUNDED) {
        currency.refundedMinor += transaction.amountMinor;
      } else if (transaction.status === PaymentTransactionStatus.FAILED) {
        currency.failedMinor += transaction.amountMinor;
      }
      currencies.set(transaction.currency, currency);

      const sourceKey = `${transaction.invoice.plan.audience}:${transaction.invoice.plan.name}:${transaction.currency}`;
      const line = sourceLines.get(sourceKey) ?? {
        source: transaction.invoice.plan.name,
        audience: transaction.invoice.plan.audience,
        currency: transaction.currency,
        collectedMinor: 0,
        refundedMinor: 0,
        transactions: 0,
      };
      line.transactions += 1;
      if (transaction.status === PaymentTransactionStatus.SUCCEEDED) {
        line.collectedMinor += transaction.amountMinor;
      }
      if (transaction.status === PaymentTransactionStatus.REFUNDED) {
        line.refundedMinor += transaction.amountMinor;
      }
      sourceLines.set(sourceKey, line);

      const bucket = this.bucketKey(transaction.createdAt, unit);
      const trendKey = `${bucket}:${transaction.currency}`;
      const point = trend.get(trendKey) ?? {
        key: bucket,
        currency: transaction.currency,
        collectedMinor: 0,
        refundedMinor: 0,
      };
      if (transaction.status === PaymentTransactionStatus.SUCCEEDED) {
        point.collectedMinor += transaction.amountMinor;
      }
      if (transaction.status === PaymentTransactionStatus.REFUNDED) {
        point.refundedMinor += transaction.amountMinor;
      }
      trend.set(trendKey, point);
    }

    return {
      period: this.serializeRange(range),
      bucketUnit: unit,
      currencies: [...currencies.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
      sources: [...sourceLines.values()].sort(
        (a, b) => b.collectedMinor - a.collectedMinor || a.source.localeCompare(b.source),
      ),
      trend: [...trend.values()].sort(
        (a, b) => a.key.localeCompare(b.key) || a.currency.localeCompare(b.currency),
      ),
      invoiceStates: Object.fromEntries(
        invoiceStates.map((row) => [row.status, row._count._all]),
      ),
      subscriptionStates: Object.fromEntries(
        subscriptionStates.map((row) => [row.status, row._count._all]),
      ),
      transactions: transactions.slice(0, 100).map((transaction) => ({
        id: transaction.id,
        invoiceNumber: transaction.invoice.number,
        description: transaction.invoice.description,
        source: transaction.invoice.plan.name,
        audience: transaction.invoice.plan.audience,
        provider: transaction.provider,
        providerReference: transaction.providerReference,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        status: transaction.status,
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt,
      })),
    };
  }

  async health() {
    const checkedAt = new Date();
    const telemetry = this.telemetry.snapshot();
    const [database, realtime] = await Promise.all([
      this.databaseHealth(),
      this.realtimeHealth(),
    ]);
    const apiStatus: HealthStatus =
      telemetry.requestCount >= 20 && telemetry.errorRate >= 20
        ? 'DOWN'
        : telemetry.averageLatencyMs >= 1_000 ||
            (telemetry.requestCount >= 20 && telemetry.errorRate >= 5)
          ? 'DEGRADED'
          : 'HEALTHY';

    const services = [
      {
        key: 'api',
        name: 'Drift API',
        status: apiStatus,
        latencyMs: telemetry.averageLatencyMs,
        errorRate: telemetry.errorRate,
        detail: `${telemetry.requestCount} requests observed by this instance since ${telemetry.startedAt}.`,
      },
      database,
      realtime,
    ];
    const acknowledgements = await this.prisma.adminAuditLog.findMany({
      where: {
        action: 'system_health.acknowledge',
        entityType: 'ServiceHealth',
        entityId: { in: services.map((service) => service.key) },
      },
      select: {
        entityId: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const latest = new Map<string, (typeof acknowledgements)[number]>();
    for (const acknowledgement of acknowledgements) {
      if (!latest.has(acknowledgement.entityId)) {
        latest.set(acknowledgement.entityId, acknowledgement);
      }
    }

    return {
      checkedAt: checkedAt.toISOString(),
      overallStatus: services.some((service) => service.status === 'DOWN')
        ? 'DOWN'
        : services.some((service) => service.status === 'DEGRADED')
          ? 'DEGRADED'
          : 'HEALTHY',
      services: services.map((service) => {
        const acknowledgement = latest.get(service.key);
        return {
          ...service,
          acknowledgement: acknowledgement
            ? {
                at: acknowledgement.createdAt,
                by:
                  acknowledgement.actor.name ?? acknowledgement.actor.email,
              }
            : null,
        };
      }),
    };
  }

  async acknowledgeIncident(actorId: string, serviceKey: string) {
    const services = new Set(['api', 'database', 'realtime']);
    if (!services.has(serviceKey)) {
      throw new BadRequestException('Unknown service incident.');
    }
    await this.audit.record(
      actorId,
      'system_health.acknowledge',
      'ServiceHealth',
      serviceKey,
      { acknowledgedAt: new Date().toISOString() },
    );
    return { acknowledged: true, serviceKey };
  }

  private async databaseHealth() {
    const started = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        key: 'database',
        name: 'PostgreSQL',
        status: 'HEALTHY' as HealthStatus,
        latencyMs: Math.round(performance.now() - started),
        errorRate: null,
        detail: 'Primary database accepted a live query.',
      };
    } catch (error) {
      return {
        key: 'database',
        name: 'PostgreSQL',
        status: 'DOWN' as HealthStatus,
        latencyMs: Math.round(performance.now() - started),
        errorRate: null,
        detail: this.errorMessage(error, 'Database query failed.'),
      };
    }
  }

  private async realtimeHealth() {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      return {
        key: 'realtime',
        name: 'Realtime fan-out',
        status: 'DEGRADED' as HealthStatus,
        latencyMs: null,
        errorRate: null,
        detail: 'REDIS_URL is not configured; realtime is limited to one API instance.',
      };
    }

    const started = performance.now();
    const client = createClient({
      url,
      socket: { connectTimeout: 2_000, reconnectStrategy: false },
    });
    client.on('error', () => undefined);
    try {
      await client.connect();
      await client.ping();
      return {
        key: 'realtime',
        name: 'Realtime fan-out',
        status: 'HEALTHY' as HealthStatus,
        latencyMs: Math.round(performance.now() - started),
        errorRate: null,
        detail: 'Redis accepted a live PING.',
      };
    } catch (error) {
      return {
        key: 'realtime',
        name: 'Realtime fan-out',
        status: 'DOWN' as HealthStatus,
        latencyMs: Math.round(performance.now() - started),
        errorRate: null,
        detail: this.errorMessage(error, 'Redis could not be reached.'),
      };
    } finally {
      if (client.isOpen) await client.quit().catch(() => client.disconnect());
    }
  }

  private parseRange(from?: string, to?: string) {
    const end = to ? this.parseDate(to, true) : new Date();
    const start = from
      ? this.parseDate(from, false)
      : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1_000);
    if (start > end) throw new BadRequestException('From date must be before to date.');
    if (end.getTime() - start.getTime() > 2 * 366 * 24 * 60 * 60 * 1_000) {
      throw new BadRequestException('Analytics ranges are limited to two years.');
    }
    return { from: start, to: end };
  }

  private parseDate(value: string, endOfDay: boolean) {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date range.');
    return date;
  }

  private dateFilter(range: { from: Date; to: Date }) {
    return { gte: range.from, lte: range.to };
  }

  private serializeRange(range: { from: Date; to: Date }) {
    return { from: range.from.toISOString(), to: range.to.toISOString() };
  }

  private inRange(date: Date, range: { from: Date; to: Date }) {
    return date >= range.from && date <= range.to;
  }

  private bucketUnit(range: { from: Date; to: Date }): BucketUnit {
    const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
    if (days > 180) return 'month';
    if (days > 45) return 'week';
    return 'day';
  }

  private bucketKey(date: Date, unit: BucketUnit) {
    const value = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    if (unit === 'month') {
      value.setUTCDate(1);
    } else if (unit === 'week') {
      const day = value.getUTCDay() || 7;
      value.setUTCDate(value.getUTCDate() - day + 1);
    }
    return value.toISOString().slice(0, 10);
  }

  private emptySeries(range: { from: Date; to: Date }, unit: BucketUnit) {
    const cursor = new Date(`${this.bucketKey(range.from, unit)}T00:00:00.000Z`);
    const buckets: { key: string }[] = [];
    while (cursor <= range.to) {
      buckets.push({ key: cursor.toISOString().slice(0, 10) });
      if (unit === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      else cursor.setUTCDate(cursor.getUTCDate() + (unit === 'week' ? 7 : 1));
    }
    return buckets;
  }

  private errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
