-- CreateTable
CREATE TABLE "TrafficSnapshot" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "rawUp" BIGINT NOT NULL DEFAULT 0,
    "rawDown" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrafficSnapshot_subscriptionId_idx" ON "TrafficSnapshot"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficSnapshot_subscriptionId_nodeId_key" ON "TrafficSnapshot"("subscriptionId", "nodeId");

-- AddForeignKey
ALTER TABLE "TrafficSnapshot" ADD CONSTRAINT "TrafficSnapshot_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficSnapshot" ADD CONSTRAINT "TrafficSnapshot_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
