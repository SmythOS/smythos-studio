/*
  Warnings:

  - A unique constraint covering the columns `[userId,settingKey]` on the table `UserSetting` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `AiAgent` ADD COLUMN `salt` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `UserSetting` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `TeamSetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settingKey` VARCHAR(191) NOT NULL,
    `settingValue` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TeamSetting_teamId_settingKey_key`(`teamId`, `settingKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `UserSetting_userId_settingKey_key` ON `UserSetting`(`userId`, `settingKey`);

-- AddForeignKey
ALTER TABLE `TeamSetting` ADD CONSTRAINT `TeamSetting_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
