import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationTemplateChannel,
  NotificationTemplateStatus,
  PlatformFeatureFlagStatus,
  PlatformIntegrationStatus,
  PlatformMarketStatus,
  PlatformSystemSettingType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import {
  RecordIntegrationCheckDto,
  RotateIntegrationTokenDto,
  UpdateMarketStatusDto,
  UpsertFeatureFlagDto,
  UpsertIntegrationConfigDto,
  UpsertMarketDto,
  UpsertNotificationTemplateDto,
  UpsertSystemSettingDto,
} from './dto/platform-config-admin.dto';

@Injectable()
export class PlatformConfigAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listMarkets(query: { status?: string; search?: string }) {
    const status = this.enumValue(PlatformMarketStatus, query.status);
    const search = query.search?.trim();
    const markets = await this.prisma.supportedMarket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { countryCode: { contains: search, mode: 'insensitive' } },
                { countryName: { contains: search, mode: 'insensitive' } },
                { cityName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { featureFlags: true } } },
      orderBy: [{ status: 'asc' }, { countryName: 'asc' }, { cityName: 'asc' }],
      take: 250,
    });
    return { markets };
  }

  async createMarket(actorId: string, dto: UpsertMarketDto) {
    const market = await this.prisma.supportedMarket.create({
      data: this.marketData(dto),
    });
    await this.audit.record(
      actorId,
      'platform_config.market.create',
      'SupportedMarket',
      market.id,
      {
        countryCode: market.countryCode,
        cityName: market.cityName,
        status: market.status,
      },
    );
    return { market };
  }

  async updateMarket(actorId: string, marketId: string, dto: UpsertMarketDto) {
    const existing = await this.requireMarket(marketId);
    const market = await this.prisma.supportedMarket.update({
      where: { id: marketId },
      data: this.marketData(dto),
      include: { _count: { select: { featureFlags: true } } },
    });
    await this.audit.record(
      actorId,
      'platform_config.market.update',
      'SupportedMarket',
      marketId,
      {
        previous: {
          countryCode: existing.countryCode,
          countryName: existing.countryName,
          cityName: existing.cityName,
          status: existing.status,
        },
        next: {
          countryCode: market.countryCode,
          countryName: market.countryName,
          cityName: market.cityName,
          status: market.status,
        },
      },
    );
    return { market };
  }

  async updateMarketStatus(
    actorId: string,
    marketId: string,
    dto: UpdateMarketStatusDto,
  ) {
    const existing = await this.requireMarket(marketId);
    if (existing.status === dto.status) return { market: existing };
    const market = await this.prisma.supportedMarket.update({
      where: { id: marketId },
      data: { status: dto.status },
      include: { _count: { select: { featureFlags: true } } },
    });
    await this.audit.record(
      actorId,
      'platform_config.market.status',
      'SupportedMarket',
      marketId,
      {
        previousStatus: existing.status,
        nextStatus: dto.status,
        reason: dto.reason?.trim() || null,
      },
    );
    return { market };
  }

  async listFeatureFlags(query: {
    status?: string;
    marketId?: string;
    search?: string;
  }) {
    const status = this.enumValue(PlatformFeatureFlagStatus, query.status);
    const search = query.search?.trim();
    const flags = await this.prisma.featureFlag.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(query.marketId ? { marketId: query.marketId } : {}),
        ...(search
          ? {
              OR: [
                { key: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { cohort: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { market: true },
      orderBy: [{ status: 'asc' }, { key: 'asc' }],
      take: 250,
    });
    const markets = await this.prisma.supportedMarket.findMany({
      orderBy: [{ countryName: 'asc' }, { cityName: 'asc' }],
      take: 250,
    });
    return { flags, markets };
  }

  async createFeatureFlag(actorId: string, dto: UpsertFeatureFlagDto) {
    await this.validateMarket(dto.marketId);
    const flag = await this.prisma.featureFlag.create({
      data: this.featureFlagData(dto),
      include: { market: true },
    });
    await this.audit.record(
      actorId,
      'platform_config.feature_flag.create',
      'FeatureFlag',
      flag.id,
      {
        key: flag.key,
        status: flag.status,
        rolloutPercentage: flag.rolloutPercentage,
        marketId: flag.marketId,
        cohort: flag.cohort,
      },
    );
    return { flag };
  }

  async updateFeatureFlag(
    actorId: string,
    flagId: string,
    dto: UpsertFeatureFlagDto,
  ) {
    const existing = await this.requireFeatureFlag(flagId);
    await this.validateMarket(dto.marketId);
    const flag = await this.prisma.featureFlag.update({
      where: { id: flagId },
      data: this.featureFlagData(dto),
      include: { market: true },
    });
    await this.audit.record(
      actorId,
      'platform_config.feature_flag.update',
      'FeatureFlag',
      flagId,
      {
        previous: {
          key: existing.key,
          status: existing.status,
          rolloutPercentage: existing.rolloutPercentage,
          marketId: existing.marketId,
          cohort: existing.cohort,
        },
        next: {
          key: flag.key,
          status: flag.status,
          rolloutPercentage: flag.rolloutPercentage,
          marketId: flag.marketId,
          cohort: flag.cohort,
        },
      },
    );
    return { flag };
  }

  async listNotificationTemplates(query: {
    status?: string;
    channel?: string;
    search?: string;
  }) {
    const status = this.enumValue(NotificationTemplateStatus, query.status);
    const channel = this.enumValue(NotificationTemplateChannel, query.channel);
    const search = query.search?.trim();
    const templates = await this.prisma.notificationTemplate.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(channel ? { channel } : {}),
        ...(search
          ? {
              OR: [
                { key: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { subject: { contains: search, mode: 'insensitive' } },
                { body: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ channel: 'asc' }, { key: 'asc' }],
      take: 250,
    });
    return { templates };
  }

  async createNotificationTemplate(
    actorId: string,
    dto: UpsertNotificationTemplateDto,
  ) {
    const template = await this.prisma.notificationTemplate.create({
      data: this.notificationTemplateData(dto),
    });
    await this.audit.record(
      actorId,
      'platform_config.notification_template.create',
      'NotificationTemplate',
      template.id,
      {
        key: template.key,
        channel: template.channel,
        status: template.status,
      },
    );
    return { template };
  }

  async updateNotificationTemplate(
    actorId: string,
    templateId: string,
    dto: UpsertNotificationTemplateDto,
  ) {
    const existing = await this.requireNotificationTemplate(templateId);
    const template = await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: this.notificationTemplateData(dto),
    });
    await this.audit.record(
      actorId,
      'platform_config.notification_template.update',
      'NotificationTemplate',
      templateId,
      {
        previous: {
          key: existing.key,
          channel: existing.channel,
          status: existing.status,
        },
        next: {
          key: template.key,
          channel: template.channel,
          status: template.status,
        },
      },
    );
    return { template };
  }

  async previewNotificationTemplate(templateId: string) {
    const template = await this.requireNotificationTemplate(templateId);
    const data = this.objectValue(template.previewData);
    return {
      preview: {
        subject: template.subject
          ? this.renderTemplate(template.subject, data)
          : null,
        body: this.renderTemplate(template.body, data),
        data,
      },
    };
  }

  async listSystemSettings(query: { type?: string; search?: string }) {
    const valueType = this.enumValue(PlatformSystemSettingType, query.type);
    const search = query.search?.trim();
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        ...(valueType ? { valueType } : {}),
        ...(search
          ? {
              OR: [
                { key: { contains: search, mode: 'insensitive' } },
                { label: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ key: 'asc' }],
      take: 250,
    });
    return { settings };
  }

  async createSystemSetting(actorId: string, dto: UpsertSystemSettingDto) {
    const setting = await this.prisma.systemSetting.create({
      data: this.systemSettingData(dto),
    });
    await this.audit.record(
      actorId,
      'platform_config.system_setting.create',
      'SystemSetting',
      setting.id,
      {
        key: setting.key,
        valueType: setting.valueType,
      },
    );
    return { setting };
  }

  async updateSystemSetting(
    actorId: string,
    settingId: string,
    dto: UpsertSystemSettingDto,
  ) {
    const existing = await this.requireSystemSetting(settingId);
    const setting = await this.prisma.systemSetting.update({
      where: { id: settingId },
      data: this.systemSettingData(dto),
    });
    await this.audit.record(
      actorId,
      'platform_config.system_setting.update',
      'SystemSetting',
      settingId,
      {
        previous: { key: existing.key, valueType: existing.valueType },
        next: { key: setting.key, valueType: setting.valueType },
      },
    );
    return { setting };
  }

  async listIntegrations(query: { status?: string; search?: string }) {
    const status = this.enumValue(PlatformIntegrationStatus, query.status);
    const search = query.search?.trim();
    const integrations = await this.prisma.integrationConfig.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { providerKey: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { lastError: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { providerKey: 'asc' }],
      take: 250,
    });
    return {
      integrations: integrations.map((integration) =>
        this.integrationDto(integration),
      ),
    };
  }

  async createIntegration(actorId: string, dto: UpsertIntegrationConfigDto) {
    const integration = await this.prisma.integrationConfig.create({
      data: this.integrationData(dto),
    });
    await this.audit.record(
      actorId,
      'platform_config.integration.create',
      'IntegrationConfig',
      integration.id,
      {
        providerKey: integration.providerKey,
        status: integration.status,
        hasSecretRef: Boolean(integration.secretRef),
      },
    );
    return { integration: this.integrationDto(integration) };
  }

  async updateIntegration(
    actorId: string,
    integrationId: string,
    dto: UpsertIntegrationConfigDto,
  ) {
    const existing = await this.requireIntegration(integrationId);
    const integration = await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: this.integrationData(dto),
    });
    await this.audit.record(
      actorId,
      'platform_config.integration.update',
      'IntegrationConfig',
      integrationId,
      {
        previous: {
          providerKey: existing.providerKey,
          status: existing.status,
          hasSecretRef: Boolean(existing.secretRef),
        },
        next: {
          providerKey: integration.providerKey,
          status: integration.status,
          hasSecretRef: Boolean(integration.secretRef),
        },
      },
    );
    return { integration: this.integrationDto(integration) };
  }

  async recordIntegrationCheck(
    actorId: string,
    integrationId: string,
    dto: RecordIntegrationCheckDto,
  ) {
    const existing = await this.requireIntegration(integrationId);
    if (dto.status === PlatformIntegrationStatus.ERROR && !dto.error?.trim()) {
      throw new BadRequestException(
        'Record the provider failure detail for an error check.',
      );
    }
    const integration = await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: {
        status: dto.status,
        lastCheckedAt: new Date(),
        lastError:
          dto.status === PlatformIntegrationStatus.ERROR
            ? dto.error!.trim()
            : null,
        disabledAt:
          dto.status === PlatformIntegrationStatus.DISCONNECTED
            ? (existing.disabledAt ?? new Date())
            : null,
      },
    });
    await this.audit.record(
      actorId,
      'platform_config.integration.check_recorded',
      'IntegrationConfig',
      integrationId,
      {
        providerKey: integration.providerKey,
        previousStatus: existing.status,
        nextStatus: integration.status,
        error: integration.lastError,
        liveProviderCall: false,
      },
    );
    return { integration: this.integrationDto(integration) };
  }

  async rotateIntegrationToken(
    actorId: string,
    integrationId: string,
    dto: RotateIntegrationTokenDto,
  ) {
    const existing = await this.requireIntegration(integrationId);
    const integration = await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: {
        secretRef: dto.secretRef.trim(),
        status: PlatformIntegrationStatus.DISCONNECTED,
        lastError:
          'Credential reference rotated. Record a connection check after provider configuration is verified.',
        disabledAt: new Date(),
      },
    });
    await this.audit.record(
      actorId,
      'platform_config.integration.rotate_token',
      'IntegrationConfig',
      integrationId,
      {
        providerKey: integration.providerKey,
        previousHadSecretRef: Boolean(existing.secretRef),
        nextHadSecretRef: Boolean(integration.secretRef),
        reason: dto.reason?.trim() || null,
        liveProviderCall: false,
      },
    );
    return { integration: this.integrationDto(integration) };
  }

  async disableIntegration(
    actorId: string,
    integrationId: string,
    dto: { reason?: string },
  ) {
    const existing = await this.requireIntegration(integrationId);
    const integration = await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: {
        status: PlatformIntegrationStatus.DISCONNECTED,
        disabledAt: new Date(),
      },
    });
    await this.audit.record(
      actorId,
      'platform_config.integration.disable',
      'IntegrationConfig',
      integrationId,
      {
        providerKey: integration.providerKey,
        previousStatus: existing.status,
        reason: dto.reason?.trim() || null,
      },
    );
    return { integration: this.integrationDto(integration) };
  }

  private marketData(dto: UpsertMarketDto) {
    return {
      countryCode: dto.countryCode.trim().toUpperCase(),
      countryName: dto.countryName.trim(),
      cityName: dto.cityName.trim(),
      timezone: dto.timezone?.trim() || null,
      status: dto.status,
      notes: dto.notes?.trim() || null,
    };
  }

  private featureFlagData(dto: UpsertFeatureFlagDto) {
    const status = dto.status;
    let rolloutPercentage = dto.rolloutPercentage;
    if (status === PlatformFeatureFlagStatus.ON) rolloutPercentage = 100;
    if (status === PlatformFeatureFlagStatus.OFF) rolloutPercentage = 0;
    if (
      status === PlatformFeatureFlagStatus.PARTIAL &&
      (rolloutPercentage <= 0 || rolloutPercentage >= 100)
    ) {
      throw new BadRequestException(
        'Partial feature flags require a rollout percentage from 1 to 99.',
      );
    }
    return {
      key: this.normalizeKey(dto.key),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      status,
      rolloutPercentage,
      marketId: dto.marketId?.trim() || null,
      cohort: dto.cohort?.trim() || null,
    };
  }

  private notificationTemplateData(dto: UpsertNotificationTemplateDto) {
    if (
      dto.channel === NotificationTemplateChannel.EMAIL &&
      !dto.subject?.trim()
    ) {
      throw new BadRequestException('Email templates require a subject.');
    }
    return {
      key: this.normalizeKey(dto.key),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      channel: dto.channel,
      subject: dto.subject?.trim() || null,
      body: dto.body.trim(),
      previewData: this.jsonObject(
        dto.previewData ?? {},
      ) as Prisma.InputJsonValue,
      status: dto.status,
    };
  }

  private systemSettingData(dto: UpsertSystemSettingDto) {
    return {
      key: this.normalizeKey(dto.key),
      label: dto.label.trim(),
      description: dto.description?.trim() || null,
      valueType: dto.valueType,
      value: this.typedValue(dto.valueType, dto.value),
    };
  }

  private integrationData(dto: UpsertIntegrationConfigDto) {
    if (
      dto.status === PlatformIntegrationStatus.ERROR &&
      !dto.lastError?.trim()
    ) {
      throw new BadRequestException(
        'Error integrations require provider failure detail.',
      );
    }
    return {
      providerKey: this.normalizeKey(dto.providerKey),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      config: dto.config
        ? (this.jsonObject(dto.config) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      secretRef: dto.secretRef?.trim() || null,
      status: dto.status,
      lastError:
        dto.status === PlatformIntegrationStatus.ERROR
          ? (dto.lastError?.trim() ?? null)
          : null,
      disabledAt:
        dto.status === PlatformIntegrationStatus.DISCONNECTED
          ? new Date()
          : null,
    };
  }

  private typedValue(
    type: PlatformSystemSettingType,
    value: unknown,
  ): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      throw new BadRequestException('Setting value is required.');
    }
    if (type === PlatformSystemSettingType.STRING) {
      if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean'
      ) {
        throw new BadRequestException(
          'String settings require a primitive value.',
        );
      }
      return String(value);
    }
    if (type === PlatformSystemSettingType.NUMBER) {
      const next = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(next))
        throw new BadRequestException(
          'Number settings require a numeric value.',
        );
      return next;
    }
    if (type === PlatformSystemSettingType.BOOLEAN) {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new BadRequestException('Boolean settings require true or false.');
    }
    return this.jsonValue(value);
  }

  private jsonObject(value: unknown): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
  }

  private jsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      throw new BadRequestException('JSON settings require a non-null value.');
    }
    try {
      JSON.stringify(value);
    } catch {
      throw new BadRequestException('JSON settings must be serialisable.');
    }
    return value;
  }

  private renderTemplate(value: string, data: Record<string, unknown>) {
    return value.replace(
      /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
      (_match, key: string) => {
        const replacement = data[key];
        if (replacement === undefined || replacement === null) return '';
        if (
          typeof replacement === 'string' ||
          typeof replacement === 'number' ||
          typeof replacement === 'boolean'
        ) {
          return String(replacement);
        }
        return JSON.stringify(replacement);
      },
    );
  }

  private objectValue(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return value;
  }

  private integrationDto(integration: {
    id: string;
    providerKey: string;
    name: string;
    description: string | null;
    config: Prisma.JsonValue | null;
    secretRef: string | null;
    status: PlatformIntegrationStatus;
    lastCheckedAt: Date | null;
    lastError: string | null;
    disabledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...integration,
      hasSecretRef: Boolean(integration.secretRef),
      secretRef: integration.secretRef,
      liveProviderValidation: false,
    };
  }

  private normalizeKey(value: string) {
    const key = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!key)
      throw new BadRequestException(
        'Key must include at least one letter or number.',
      );
    return key;
  }

  private validateMarket(marketId?: string | null) {
    if (!marketId) return Promise.resolve();
    return this.prisma.supportedMarket
      .findUnique({ where: { id: marketId } })
      .then((market) => {
        if (!market)
          throw new BadRequestException('Selected market does not exist.');
      });
  }

  private requireMarket(id: string) {
    return this.prisma.supportedMarket
      .findUnique({
        where: { id },
        include: { _count: { select: { featureFlags: true } } },
      })
      .then((market) => {
        if (!market) throw new NotFoundException('Market not found.');
        return market;
      });
  }

  private requireFeatureFlag(id: string) {
    return this.prisma.featureFlag
      .findUnique({ where: { id } })
      .then((flag) => {
        if (!flag) throw new NotFoundException('Feature flag not found.');
        return flag;
      });
  }

  private requireNotificationTemplate(id: string) {
    return this.prisma.notificationTemplate
      .findUnique({ where: { id } })
      .then((template) => {
        if (!template)
          throw new NotFoundException('Notification template not found.');
        return template;
      });
  }

  private requireSystemSetting(id: string) {
    return this.prisma.systemSetting
      .findUnique({ where: { id } })
      .then((setting) => {
        if (!setting) throw new NotFoundException('System setting not found.');
        return setting;
      });
  }

  private requireIntegration(id: string) {
    return this.prisma.integrationConfig
      .findUnique({ where: { id } })
      .then((integration) => {
        if (!integration)
          throw new NotFoundException('Integration config not found.');
        return integration;
      });
  }

  private enumValue<T extends Record<string, string>>(
    values: T,
    value?: string,
  ) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(values).includes(normalized)
      ? (normalized as T[keyof T])
      : undefined;
  }
}
