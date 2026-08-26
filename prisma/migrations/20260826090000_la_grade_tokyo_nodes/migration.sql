-- Standard uses LA regular (B). Hybrid/Workspace use Tokyo + LA premium (A).
-- Do not seed fake 3x-ui hosts here; register real panels in admin after deploy.

UPDATE "Plan"
SET
  "nodeCodes" = ARRAY['LA(B)']::text[],
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global-lite', 'global-week', 'global-year', 'global-standard');

UPDATE "Plan"
SET
  "nodeCodes" = ARRAY['Tokyo', 'LA(A)']::text[],
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

DELETE FROM "Node"
WHERE "id" IN ('g-sg-bw', 'g-jp-bw', 'g-us-rn');
