-- AlterTable
ALTER TABLE `Namespace` ADD COLUMN `isOnCustomStorage` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Subscription` ADD COLUMN `properties` JSON NULL;
