-- CreateEnum
CREATE TYPE "BootstrapJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "NodeBootstrapJob" (
    "id" TEXT NOT NULL,
    "status" "BootstrapJobStatus" NOT NULL DEFAULT 'QUEUED',
    "product" "Product" NOT NULL,
    "role" "NodeRole" NOT NULL DEFAULT 'PRIMARY',
    "provider" TEXT NOT NULL DEFAULT '',
    "poolId" TEXT,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "ddnsHost" TEXT NOT NULL,
    "sshHost" TEXT NOT NULL,
    "sshPort" INTEGER NOT NULL DEFAULT 22,
    "sshUser" TEXT NOT NULL DEFAULT 'root',
    "panelPort" INTEGER NOT NULL DEFAULT 2053,
    "vlessPort" INTEGER NOT NULL DEFAULT 443,
    "realityDest" TEXT NOT NULL DEFAULT 'www.microsoft.com',
    "nodeId" TEXT,
    "log" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NodeBootstrapJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NodeBootstrapJob_status_createdAt_idx" ON "NodeBootstrapJob"("status", "createdAt");
