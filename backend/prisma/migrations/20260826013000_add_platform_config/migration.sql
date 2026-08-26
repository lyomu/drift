-- Phase 5I: platform-admin platform configuration.
-- Migration source only; execution is deferred to the consolidated QA pass.

CREATE TYPE "PlatformMarketStatus" AS ENUM ('ACTIVE', 'COMING_SOON', 'INACTIVE');
CREATE TYPE "PlatformFeatureFlagStatus" AS ENUM ('OFF', 'ON', 'PARTIAL');
CREATE TYPE "NotificationTemplateChannel" AS ENUM ('PUSH', 'EMAIL', 'SMS');
CREATE TYPE "NotificationTemplateStatus" AS ENUM ('DRAFT', 'LIVE');
CREATE TYPE "PlatformSystemSettingType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');
CREATE TYPE "PlatformIntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

CREATE TABLE "supported_markets" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "timezone" TEXT,
    "status" "PlatformMarketStatus" NOT NULL DEFAULT 'COMING_SOON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supported_markets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supported_markets_countryCode_cityName_key"
  ON "supported_markets"("countryCode", "cityName");
CREATE INDEX "supported_markets_status_countryName_cityName_idx"
  ON "supported_markets"("status", "countryName", "cityName");

CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlatformFeatureFlagStatus" NOT NULL DEFAULT 'OFF',
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "marketId" TEXT,
    "cohort" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");
CREATE INDEX "feature_flags_status_key_idx" ON "feature_flags"("status", "key");
CREATE INDEX "feature_flags_marketId_idx" ON "feature_flags"("marketId");

ALTER TABLE "feature_flags"
  ADD CONSTRAINT "feature_flags_marketId_fkey"
  FOREIGN KEY ("marketId") REFERENCES "supported_markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "NotificationTemplateChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "previewData" JSONB,
    "status" "NotificationTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_templates_key_channel_key"
  ON "notification_templates"("key", "channel");
CREATE INDEX "notification_templates_status_channel_idx"
  ON "notification_templates"("status", "channel");

CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "PlatformSystemSettingType" NOT NULL DEFAULT 'STRING',
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
CREATE INDEX "system_settings_valueType_key_idx" ON "system_settings"("valueType", "key");

CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "secretRef" TEXT,
    "status" "PlatformIntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_configs_providerKey_key" ON "integration_configs"("providerKey");
CREATE INDEX "integration_configs_status_providerKey_idx"
  ON "integration_configs"("status", "providerKey");
