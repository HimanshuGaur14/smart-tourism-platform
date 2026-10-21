-- AlterTable
ALTER TABLE "VendorListing" ADD COLUMN     "isSample" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderationNote" TEXT;
