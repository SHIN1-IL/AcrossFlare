-- AlterTable
ALTER TABLE "Node"
ADD COLUMN     "vlessPort" INTEGER NOT NULL DEFAULT 443,
ADD COLUMN     "realityPublicKey" TEXT,
ADD COLUMN     "realityShortId" TEXT,
ADD COLUMN     "realityServerName" TEXT,
ADD COLUMN     "realityFingerprint" TEXT;
