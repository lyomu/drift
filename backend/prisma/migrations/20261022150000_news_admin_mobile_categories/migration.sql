-- Preserve legacy enum values as slugs while allowing future admin-managed categories.
ALTER TYPE "NewsModerationStatus" ADD VALUE 'ARCHIVED';
ALTER TABLE "news_stories"
  ALTER COLUMN "categories" TYPE TEXT[] USING "categories"::TEXT[],
  ADD COLUMN "moderationReason" TEXT,
  ADD COLUMN "editorialVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "news_category_config" (
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_category_config_pkey" PRIMARY KEY ("slug")
);
CREATE INDEX "news_category_config_enabled_sortOrder_idx" ON "news_category_config"("enabled", "sortOrder");

INSERT INTO "news_category_config" ("slug", "label", "sortOrder") VALUES
  ('LATEST', 'Latest', 0),
  ('PROFESSIONAL_TENNIS', 'Professional Tennis', 10),
  ('PLAYERS', 'Players', 20),
  ('TOURNAMENTS', 'Tournaments', 30),
  ('LOCAL', 'Local', 40),
  ('AFRICA', 'Africa', 50),
  ('CLUBS', 'Clubs', 60),
  ('COMMUNITY', 'Community', 70);

CREATE TABLE "news_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "ingestionPaused" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_settings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "news_settings" ("id", "ingestionPaused") VALUES ('default', false);
