-- Platform rulings on disputes: staff are separate credentials (Wave 5),
-- so their attribution needs its own nullable column beside confirmedById.
-- Exactly one of the two is populated for any resolved result.

-- AlterTable
ALTER TABLE "match_results" ADD COLUMN "confirmedByPlatformAdminId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "match_results_confirmedByPlatformAdminId_key" ON "match_results"("confirmedByPlatformAdminId");

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_confirmedByPlatformAdminId_fkey" FOREIGN KEY ("confirmedByPlatformAdminId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
