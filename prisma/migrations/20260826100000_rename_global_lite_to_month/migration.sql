UPDATE "Plan"
SET
  "name" = 'Month',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global-lite';

UPDATE "Plan"
SET
  "name" = 'Week',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hybrid-week';

UPDATE "Plan"
SET
  "name" = 'Month',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hybrid-lite';

UPDATE "Plan"
SET
  "name" = 'Year',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'hybrid-year';
