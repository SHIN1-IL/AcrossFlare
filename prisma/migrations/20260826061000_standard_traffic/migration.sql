UPDATE "Plan"
SET
  "trafficGb" = 100,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global-lite';

UPDATE "Plan"
SET
  "trafficGb" = 1200,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global-year';
