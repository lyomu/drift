export type MarketStatus = "ACTIVE" | "COMING_SOON" | "INACTIVE";
export type FeatureFlagStatus = "OFF" | "ON" | "PARTIAL";
export type NotificationTemplateChannel = "PUSH" | "EMAIL" | "SMS";
export type NotificationTemplateStatus = "DRAFT" | "LIVE";
export type SystemSettingType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
export type IntegrationStatus = "CONNECTED" | "DISCONNECTED" | "ERROR";

export type SupportedMarket = {
  id: string;
  countryCode: string;
  countryName: string;
  cityName: string;
  timezone: string | null;
  status: MarketStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { featureFlags: number };
};

export type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: FeatureFlagStatus;
  rolloutPercentage: number;
  marketId: string | null;
  market: SupportedMarket | null;
  cohort: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationTemplate = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  channel: NotificationTemplateChannel;
  subject: string | null;
  body: string;
  previewData: Record<string, unknown> | null;
  status: NotificationTemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export type NotificationTemplatePreview = {
  subject: string | null;
  body: string;
  data: Record<string, unknown>;
};

export type SystemSetting = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  valueType: SystemSettingType;
  value: unknown;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationConfig = {
  id: string;
  providerKey: string;
  name: string;
  description: string | null;
  config: Record<string, unknown> | null;
  secretRef: string | null;
  hasSecretRef: boolean;
  status: IntegrationStatus;
  lastCheckedAt: string | null;
  lastError: string | null;
  disabledAt: string | null;
  liveProviderValidation: false;
  createdAt: string;
  updatedAt: string;
};

export function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "None";
}

export function dateLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function jsonText(value: unknown) {
  if (value === null || value === undefined) return "{}";
  return JSON.stringify(value, null, 2);
}

export function parseJsonObject(value: string, fallback: Record<string, unknown> | null = {}) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Use a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function parseSettingValue(type: SystemSettingType, value: string) {
  if (type === "STRING") return value;
  if (type === "NUMBER") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error("Use a valid number.");
    return parsed;
  }
  if (type === "BOOLEAN") return value === "true";
  return JSON.parse(value) as unknown;
}
