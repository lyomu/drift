-- CreateTable
CREATE TABLE "court_photo_assets" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_photo_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "court_photo_assets_clubId_createdAt_idx" ON "court_photo_assets"("clubId", "createdAt");

-- AddForeignKey
ALTER TABLE "court_photo_assets" ADD CONSTRAINT "court_photo_assets_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_photo_assets" ADD CONSTRAINT "court_photo_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
