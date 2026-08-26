-- Catalog matches the storefront: Standard = US (LA), Hybrid/Workspace = JP + US.
-- Singapore is not used. Idempotent so local DBs already cleaned by seed stay valid.

UPDATE "Plan"
SET
  "nodeCodes" = ARRAY['US']::text[],
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global-lite', 'global-week', 'global-year', 'global-standard');

UPDATE "Plan"
SET
  "nodeCodes" = ARRAY['JP', 'US']::text[],
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
  'global-pro',
  'hybrid-week',
  'hybrid-lite',
  'hybrid-year',
  'workspace-a',
  'workspace-b',
  'workspace-c'
);

UPDATE "Plan"
SET
  "nodeCodes" = array_remove("nodeCodes", 'SG'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE 'SG' = ANY ("nodeCodes");

DELETE FROM "Node"
WHERE "id" = 'g-sg-bw'
   OR "ddns" = 'node-sg.acrossflare.com';
