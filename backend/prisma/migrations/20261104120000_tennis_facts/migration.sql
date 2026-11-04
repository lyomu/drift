-- Daily tennis fact: curated facts (EN/FR/ES), an optional uploaded image per
-- fact, and one view row per user per day.

-- CreateTable
CREATE TABLE "tennis_facts" (
    "id" TEXT NOT NULL,
    "titleEn" VARCHAR(60) NOT NULL,
    "titleFr" VARCHAR(60) NOT NULL,
    "titleEs" VARCHAR(60) NOT NULL,
    "bodyEn" VARCHAR(280) NOT NULL,
    "bodyFr" VARCHAR(280) NOT NULL,
    "bodyEs" VARCHAR(280) NOT NULL,
    "sourceEn" VARCHAR(80),
    "sourceFr" VARCHAR(80),
    "sourceEs" VARCHAR(80),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tennis_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tennis_fact_image_assets" (
    "id" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tennis_fact_image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tennis_fact_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tennis_fact_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tennis_facts_active_sortOrder_idx" ON "tennis_facts"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tennis_fact_image_assets_factId_key" ON "tennis_fact_image_assets"("factId");

-- CreateIndex
CREATE INDEX "tennis_fact_views_factId_idx" ON "tennis_fact_views"("factId");

-- CreateIndex
CREATE UNIQUE INDEX "tennis_fact_views_userId_day_key" ON "tennis_fact_views"("userId", "day");

-- AddForeignKey
ALTER TABLE "tennis_fact_image_assets" ADD CONSTRAINT "tennis_fact_image_assets_factId_fkey" FOREIGN KEY ("factId") REFERENCES "tennis_facts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tennis_fact_views" ADD CONSTRAINT "tennis_fact_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tennis_fact_views" ADD CONSTRAINT "tennis_fact_views_factId_fkey" FOREIGN KEY ("factId") REFERENCES "tennis_facts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
