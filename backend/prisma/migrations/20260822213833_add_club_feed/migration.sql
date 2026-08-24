-- CreateTable
CREATE TABLE "club_posts" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_post_reactions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_posts_clubId_createdAt_idx" ON "club_posts"("clubId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "club_post_reactions_postId_userId_emoji_key" ON "club_post_reactions"("postId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "club_posts" ADD CONSTRAINT "club_posts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_posts" ADD CONSTRAINT "club_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_posts" ADD CONSTRAINT "club_posts_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_post_reactions" ADD CONSTRAINT "club_post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "club_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_post_reactions" ADD CONSTRAINT "club_post_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
