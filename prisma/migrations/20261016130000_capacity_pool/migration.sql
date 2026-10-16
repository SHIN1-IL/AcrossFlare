-- CreateEnum
CREATE TYPE "InstanceGroupStatus" AS ENUM ('READY', 'OPENING', 'DRAINING');

-- CreateTable
CREATE TABLE "CapacityPool" (
    "id" TEXT NOT NULL,
    "product" "Product" NOT NULL,
    "name" TEXT NOT NULL,
    "maxSelectable" INTEGER NOT NULL DEFAULT 1,
    "seatsMaxDefault" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacityPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanceGroup" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "InstanceGroupStatus" NOT NULL DEFAULT 'READY',
    "seatsUsed" INTEGER NOT NULL DEFAULT 0,
    "seatsMax" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstanceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanceGroupNode" (
    "groupId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstanceGroupNode_pkey" PRIMARY KEY ("groupId","nodeId")
);

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "poolId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "instanceGroupId" TEXT;

-- Seed default pools (idempotent)
INSERT INTO "CapacityPool" ("id", "product", "name", "maxSelectable", "seatsMaxDefault", "createdAt", "updatedAt")
VALUES
  ('global-standard', 'GLOBAL', 'Global Standard', 1, 10, NOW(), NOW()),
  ('global-hybrid', 'GLOBAL', 'Global Hybrid', 2, 10, NOW(), NOW()),
  ('marketing-default', 'MARKETING', 'Marketing Default', 1, 10, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Bind plans by legacy nodeCodes
UPDATE "Plan"
SET "poolId" = 'global-standard'
WHERE product = 'GLOBAL'
  AND "poolId" IS NULL
  AND "nodeCodes" = ARRAY['LA(B)']::TEXT[];

UPDATE "Plan"
SET "poolId" = 'global-hybrid'
WHERE product = 'GLOBAL'
  AND "poolId" IS NULL
  AND "nodeCodes" @> ARRAY['Tokyo', 'LA(A)']::TEXT[];

UPDATE "Plan"
SET "poolId" = 'marketing-default'
WHERE product = 'MARKETING'
  AND "poolId" IS NULL;

-- Default instance groups
INSERT INTO "InstanceGroup" ("id", "poolId", "name", "status", "seatsUsed", "seatsMax", "createdAt", "updatedAt")
VALUES
  ('ig-global-standard-1', 'global-standard', 'Standard G1', 'READY', 0, 10, NOW(), NOW()),
  ('ig-global-hybrid-1', 'global-hybrid', 'Hybrid G1', 'READY', 0, 10, NOW(), NOW()),
  ('ig-marketing-1', 'marketing-default', 'Marketing G1', 'READY', 0, 10, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Attach known seed node ids when present
INSERT INTO "InstanceGroupNode" ("groupId", "nodeId", "sortOrder")
SELECT 'ig-global-standard-1', id, 0 FROM "Node" WHERE id = 'g-la-b-bw'
ON CONFLICT DO NOTHING;

INSERT INTO "InstanceGroupNode" ("groupId", "nodeId", "sortOrder")
SELECT 'ig-global-hybrid-1', id, 0 FROM "Node" WHERE id = 'g-tokyo-bw'
ON CONFLICT DO NOTHING;

INSERT INTO "InstanceGroupNode" ("groupId", "nodeId", "sortOrder")
SELECT 'ig-global-hybrid-1', id, 1 FROM "Node" WHERE id = 'g-la-a-bw'
ON CONFLICT DO NOTHING;

INSERT INTO "InstanceGroupNode" ("groupId", "nodeId", "sortOrder")
SELECT 'ig-marketing-1', id, 0 FROM "Node" WHERE id = 'm-use-bw'
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "CapacityPool_product_idx" ON "CapacityPool"("product");

-- CreateIndex
CREATE INDEX "InstanceGroup_poolId_status_idx" ON "InstanceGroup"("poolId", "status");

-- CreateIndex
CREATE INDEX "InstanceGroupNode_nodeId_idx" ON "InstanceGroupNode"("nodeId");

-- CreateIndex
CREATE INDEX "Plan_poolId_idx" ON "Plan"("poolId");

-- CreateIndex
CREATE INDEX "Subscription_instanceGroupId_idx" ON "Subscription"("instanceGroupId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CapacityPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceGroup" ADD CONSTRAINT "InstanceGroup_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CapacityPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceGroupNode" ADD CONSTRAINT "InstanceGroupNode_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "InstanceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceGroupNode" ADD CONSTRAINT "InstanceGroupNode_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_instanceGroupId_fkey" FOREIGN KEY ("instanceGroupId") REFERENCES "InstanceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
