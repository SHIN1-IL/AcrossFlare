ALTER TABLE "EsimProduct" ADD COLUMN "priceUsd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EsimProduct" ADD COLUMN "priceCny" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EsimProduct" ADD COLUMN "priceJpy" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payment" ADD COLUMN "esimChargedAmount" INTEGER;

ALTER TABLE "EsimOrder" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW';
ALTER TABLE "EsimOrder" ADD COLUMN "chargedAmount" INTEGER NOT NULL DEFAULT 0;

UPDATE "EsimProduct"
SET "priceUsd" = 15, "priceCny" = 99, "priceJpy" = 2300
WHERE "id" = 'cn-5gb';

UPDATE "EsimProduct"
SET "priceUsd" = 22, "priceCny" = 149, "priceJpy" = 3400
WHERE "id" = 'cn-10gb';
