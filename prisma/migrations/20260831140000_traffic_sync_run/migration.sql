-- CreateTable
CREATE TABLE "TrafficSyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "subscriptions" INTEGER NOT NULL,
    "updates" INTEGER NOT NULL,
    "failovers" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "TrafficSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrafficSyncRun_completedAt_idx" ON "TrafficSyncRun"("completedAt" DESC);
