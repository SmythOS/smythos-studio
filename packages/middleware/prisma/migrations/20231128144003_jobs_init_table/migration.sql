-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL DEFAULT 'Untitled Job',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `data` JSON NULL,
    `options` JSON NULL,
    `signature` VARCHAR(191) NULL,
    `aiAgentId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NULL,
    `jobLogs` JSON NULL,

    INDEX `Job_aiAgentId_idx`(`aiAgentId`),
    INDEX `Job_teamId_idx`(`teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
