-- CreateEnum
CREATE TYPE "ChinaReachability" AS ENUM ('UNKNOWN', 'OPEN', 'BLOCKED', 'DOWN', 'PARTIAL');

-- AlterTable
ALTER TABLE "Node" ADD COLUMN "chinaReachability" "ChinaReachability" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Node" ADD COLUMN "chinaCheckedAt" TIMESTAMP(3);
