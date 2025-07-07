-- AlterTable
ALTER TABLE `Collection` MODIFY `icon` MEDIUMTEXT NULL;

-- AlterTable
ALTER TABLE `Subscription` ADD COLUMN `object` JSON NULL;
