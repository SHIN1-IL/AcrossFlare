-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "probeNodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_probeNodeId_key" ON "Subscription"("probeNodeId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_probeNodeId_fkey" FOREIGN KEY ("probeNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
