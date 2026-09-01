import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  NotificationTemplateChannel,
  NotificationTemplateStatus,
  PlatformFeatureFlagStatus,
  PlatformIntegrationStatus,
  PlatformMarketStatus,
} from '@prisma/client';

export class UpsertMarketDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  countryName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  cityName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string | null;

  @IsEnum(PlatformMarketStatus)
  status!: PlatformMarketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateMarketStatusDto {
  @IsEnum(PlatformMarketStatus)
  status!: PlatformMarketStatus;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason?: string;
}

export class UpsertFeatureFlagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(PlatformFeatureFlagStatus)
  status!: PlatformFeatureFlagStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage!: number;

  @IsOptional()
  @IsString()
  marketId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cohort?: string | null;
}

export class UpsertNotificationTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(NotificationTemplateChannel)
  channel!: NotificationTemplateChannel;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(6000)
  body!: string;

  @IsOptional()
  @IsObject()
  previewData?: Record<string, unknown> | null;

  @IsEnum(NotificationTemplateStatus)
  status!: NotificationTemplateStatus;
}

export class UpsertIntegrationConfigDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  providerKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  secretRef?: string | null;

  @IsEnum(PlatformIntegrationStatus)
  status!: PlatformIntegrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  lastError?: string | null;
}

export class RecordIntegrationCheckDto {
  @IsEnum(PlatformIntegrationStatus)
  status!: PlatformIntegrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  error?: string | null;
}

export class RotateIntegrationTokenDto {
  @IsString()
  @MinLength(5)
  @MaxLength(400)
  secretRef!: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason?: string;
}

export class DisableIntegrationDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason?: string;
}
