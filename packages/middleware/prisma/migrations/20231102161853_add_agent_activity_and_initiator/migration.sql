-- AlterTable
ALTER TABLE `AiAgent` ADD COLUMN `createdById` INTEGER NULL;

-- CreateTable
CREATE TABLE `AiAgentActivity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `aiAgentId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiAgent` ADD CONSTRAINT `AiAgent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiAgentActivity` ADD CONSTRAINT `AiAgentActivity_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
