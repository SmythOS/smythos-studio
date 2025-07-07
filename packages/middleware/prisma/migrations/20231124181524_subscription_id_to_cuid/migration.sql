/*
  Warnings:

  - The primary key for the `Subscription` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `Team` DROP FOREIGN KEY `Team_subscriptionId_fkey`;

-- AlterTable
ALTER TABLE `Subscription` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Team` MODIFY `subscriptionId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
