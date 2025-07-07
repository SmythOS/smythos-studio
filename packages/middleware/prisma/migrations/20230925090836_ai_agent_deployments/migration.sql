-- CreateTable
CREATE TABLE `AiAgentDeployment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `aiAgentId` VARCHAR(191) NOT NULL,
    `aiAgentSettings` JSON NULL,
    `aiAgentData` JSON NULL,
    `majorVersion` INTEGER NOT NULL,
    `minorVersion` INTEGER NOT NULL,

    UNIQUE INDEX `AiAgentDeployment_aiAgentId_majorVersion_minorVersion_key`(`aiAgentId`, `majorVersion`, `minorVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiAgentDeployment` ADD CONSTRAINT `AiAgentDeployment_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
