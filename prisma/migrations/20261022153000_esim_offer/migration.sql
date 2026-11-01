-- CreateEnum
CREATE TYPE "EsimOrderStatus" AS ENUM ('AWAITING_QR', 'READY', 'CANCELLED');

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "planId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN "esimProductId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "esimName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Payment" ADD COLUMN "esimDataGb" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "esimDays" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "esimPriceKrw" INTEGER;

-- CreateTable
CREATE TABLE "EsimSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "copyNoWifi" TEXT NOT NULL,
    "copyRefund" TEXT NOT NULL,
    "copyKorea" TEXT NOT NULL,
    "copyExit" TEXT NOT NULL,
    "copyYear" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsimSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EsimProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataGb" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "priceKrw" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsimProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EsimOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataGb" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "priceKrw" INTEGER NOT NULL,
    "status" "EsimOrderStatus" NOT NULL DEFAULT 'AWAITING_QR',
    "qrText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsimOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EsimOrder_paymentId_key" ON "EsimOrder"("paymentId");
CREATE INDEX "EsimOrder_userId_idx" ON "EsimOrder"("userId");
CREATE INDEX "EsimOrder_status_idx" ON "EsimOrder"("status");

ALTER TABLE "EsimOrder" ADD CONSTRAINT "EsimOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EsimOrder" ADD CONSTRAINT "EsimOrder_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EsimOrder" ADD CONSTRAINT "EsimOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "EsimProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
