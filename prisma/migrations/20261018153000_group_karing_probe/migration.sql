-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "probeGroupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_probeGroupId_key" ON "Subscription"("probeGroupId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_probeGroupId_fkey" FOREIGN KEY ("probeGroupId") REFERENCES "InstanceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
