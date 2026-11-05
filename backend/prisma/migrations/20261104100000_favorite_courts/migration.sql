-- CreateTable
CREATE TABLE "favorite_courts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_courts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_courts_courtId_idx" ON "favorite_courts"("courtId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_courts_userId_courtId_key" ON "favorite_courts"("userId", "courtId");

-- AddForeignKey
ALTER TABLE "favorite_courts" ADD CONSTRAINT "favorite_courts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_courts" ADD CONSTRAINT "favorite_courts_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
