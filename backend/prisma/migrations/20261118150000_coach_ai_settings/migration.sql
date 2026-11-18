CREATE TABLE "coach_ai_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "encryptedKey" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'deepseek-flash',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coach_ai_settings_pkey" PRIMARY KEY ("id")
);
