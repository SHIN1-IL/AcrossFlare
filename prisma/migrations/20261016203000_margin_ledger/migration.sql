-- AlterTable
ALTER TABLE "Node" ADD COLUMN "monthlyCostKrw" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MarginAdjustment" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountKrw" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarginAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarginAdjustment_month_idx" ON "MarginAdjustment"("month");
