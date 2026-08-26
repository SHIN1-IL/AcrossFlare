UPDATE "Plan"
SET
  "name" = 'B',
  "priceKrw" = 1990000,
  "priceUsd" = 1500,
  "priceCny" = 9900,
  "priceJpy" = 230000,
  "trafficGb" = 2400,
  "backupGb" = 1,
  "nodeCodes" = ARRAY['SG', 'JP', 'US']::text[],
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'workspace-b';

UPDATE "Plan"
SET
  "name" = 'C',
  "priceKrw" = 1990000,
  "priceUsd" = 1500,
  "priceCny" = 9900,
  "priceJpy" = 230000,
  "trafficGb" = 12000,
  "backupGb" = 1,
  "nodeCodes" = ARRAY['SG', 'JP', 'US']::text[],
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'workspace-c';
