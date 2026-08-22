-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "nextcloudUser" TEXT,
ADD COLUMN     "xuiEmail" TEXT;

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "inboundId" INTEGER;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "provisionError" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "provisionStep" TEXT NOT NULL DEFAULT 'queued';
