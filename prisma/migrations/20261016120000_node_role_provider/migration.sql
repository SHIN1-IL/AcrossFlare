-- Backfill provider from legacy vendor-as-role values, then rename roles to logical slots.
ALTER TABLE "Node" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT '';

UPDATE "Node" SET "provider" = 'bandwagon' WHERE role = 'BANDWAGON' AND ("provider" = '' OR "provider" IS NULL);
UPDATE "Node" SET "provider" = 'racknerd' WHERE role = 'RACKNERD' AND ("provider" = '' OR "provider" IS NULL);

ALTER TYPE "NodeRole" RENAME VALUE 'BANDWAGON' TO 'PRIMARY';
ALTER TYPE "NodeRole" RENAME VALUE 'RACKNERD' TO 'FAILOVER';
