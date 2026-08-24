-- CreateEnum
CREATE TYPE "NewsSourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "NewsModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('LATEST', 'PROFESSIONAL_TENNIS', 'PLAYERS', 'TOURNAMENTS', 'LOCAL', 'AFRICA', 'CLUBS', 'COMMUNITY');

-- CreateTable
CREATE TABLE "news_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT,
    "status" "NewsSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_stories" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "imageUrl" TEXT,
    "highlight" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "categories" "NewsCategory"[],
    "topics" TEXT[],
    "originalUrl" TEXT NOT NULL,
    "moderationStatus" "NewsModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_stories_moderationStatus_publicationDate_idx" ON "news_stories"("moderationStatus", "publicationDate");

-- CreateIndex
CREATE UNIQUE INDEX "saved_stories_userId_storyId_key" ON "saved_stories"("userId", "storyId");

-- AddForeignKey
ALTER TABLE "news_stories" ADD CONSTRAINT "news_stories_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "news_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_stories" ADD CONSTRAINT "saved_stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_stories" ADD CONSTRAINT "saved_stories_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "news_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
