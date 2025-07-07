-- CreateTable
CREATE TABLE `AiAgentLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `domain` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `componentId` VARCHAR(191) NULL,
    `input` JSON NULL,
    `output` JSON NULL,
    `result` MEDIUMTEXT NULL,
    `error` MEDIUMTEXT NULL,
    `inputTimestamp` DATETIME(3) NULL,
    `outputTimestamp` DATETIME(3) NULL,
    `aiAgentId` VARCHAR(191) NOT NULL,

    INDEX `AiAgentLog_createdAt_idx`(`createdAt`),
    INDEX `AiAgentLog_aiAgentId_idx`(`aiAgentId`),
    INDEX `AiAgentLog_sourceId_idx`(`sourceId`),
    INDEX `AiAgentLog_componentId_idx`(`componentId`),
    INDEX `AiAgentLog_inputTimestamp_idx`(`inputTimestamp`),
    INDEX `AiAgentLog_outputTimestamp_idx`(`outputTimestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiAgentLog` ADD CONSTRAINT `AiAgentLog_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
