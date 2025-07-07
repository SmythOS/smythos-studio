/*
  Warnings:

  - You are about to drop the column `createdById` on the `AiAgent` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `AiAgent` DROP FOREIGN KEY `AiAgent_createdById_fkey`;

-- AlterTable
ALTER TABLE `AiAgent` DROP COLUMN `createdById`;

-- CreateTable
CREATE TABLE `AiAgentContributor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `isCreator` BOOLEAN NOT NULL DEFAULT false,
    `aiAgentId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiAgentContributor` ADD CONSTRAINT `AiAgentContributor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiAgentContributor` ADD CONSTRAINT `AiAgentContributor_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
