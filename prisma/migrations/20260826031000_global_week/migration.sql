INSERT INTO "Plan" (
  "id",
  "product",
  "name",
  "priceKrw",
  "priceUsd",
  "priceCny",
  "priceJpy",
  "trafficGb",
  "backupGb",
  "nodeCodes",
  "featured",
  "visible",
  "createdAt",
  "updatedAt"
) VALUES (
  'global-week',
  'GLOBAL',
  'Week',
  5900,
  5,
  29,
  680,
  20,
  1,
  ARRAY['SG']::text[],
  false,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
