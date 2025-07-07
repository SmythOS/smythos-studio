/*
  Warnings:

  - The primary key for the `Team` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `AiAgent` DROP FOREIGN KEY `AiAgent_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `DataSource` DROP FOREIGN KEY `DataSource_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `Domain` DROP FOREIGN KEY `Domain_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `Namespace` DROP FOREIGN KEY `Namespace_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `TeamInvitation` DROP FOREIGN KEY `TeamInvitation_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `TeamRole` DROP FOREIGN KEY `TeamRole_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_teamId_fkey`;

-- AlterTable
ALTER TABLE `AiAgent` MODIFY `teamId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `DataSource` MODIFY `teamId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Domain` MODIFY `teamId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Namespace` MODIFY `teamId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Team` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `TeamInvitation` MODIFY `teamId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `TeamRole` MODIFY `teamId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `teamId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamRole` ADD CONSTRAINT `TeamRole_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamInvitation` ADD CONSTRAINT `TeamInvitation_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiAgent` ADD CONSTRAINT `AiAgent_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Domain` ADD CONSTRAINT `Domain_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Namespace` ADD CONSTRAINT `Namespace_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataSource` ADD CONSTRAINT `DataSource_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
