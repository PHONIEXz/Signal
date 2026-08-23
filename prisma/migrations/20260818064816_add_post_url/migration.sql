-- AlterTable
ALTER TABLE "ConnectedAccount" ADD COLUMN "displayName" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "permalinkUrl" TEXT;
ALTER TABLE "Post" ADD COLUMN "url" TEXT;
