UPDATE "Plan"
SET
  "priceKrw" = 199000,
  "priceUsd" = 150,
  "priceCny" = 990,
  "priceJpy" = 23000,
  "trafficGb" = 100,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'workspace-a';

UPDATE "Plan"
SET
  "priceKrw" = 199000,
  "priceUsd" = 150,
  "priceCny" = 990,
  "priceJpy" = 23000,
  "trafficGb" = 200,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'workspace-b';

UPDATE "Plan"
SET
  "priceKrw" = 199000,
  "priceUsd" = 150,
  "priceCny" = 990,
  "priceJpy" = 23000,
  "trafficGb" = 1000,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'workspace-c';
