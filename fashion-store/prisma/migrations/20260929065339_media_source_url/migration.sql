-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE INDEX "Media_sourceUrl_idx" ON "Media"("sourceUrl");
