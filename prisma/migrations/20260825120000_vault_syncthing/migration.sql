-- AlterTable
ALTER TABLE "Subscription" RENAME COLUMN "nextcloudUsedGb" TO "backupUsedGb";

-- AlterTable
ALTER TABLE "Credential" RENAME COLUMN "nextcloudUrl" TO "vaultUrl";
ALTER TABLE "Credential" RENAME COLUMN "nextcloudUser" TO "vaultUser";
ALTER TABLE "Credential" RENAME COLUMN "nextcloudAppPassword" TO "syncthingFolderId";
ALTER TABLE "Credential" ADD COLUMN "syncthingUrl" TEXT;
