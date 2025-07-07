-- CreateTable
CREATE TABLE `AiAgentConversation` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `summary` MEDIUMTEXT NULL,
    `chunkSize` INTEGER NULL,
    `lastChunkID` VARCHAR(191) NULL,
    `aiAgentId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `ownerId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiAgentConversation` ADD CONSTRAINT `AiAgentConversation_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiAgentConversation` ADD CONSTRAINT `AiAgentConversation_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiAgentConversation` ADD CONSTRAINT `AiAgentConversation_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
