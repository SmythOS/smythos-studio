-- DropForeignKey
ALTER TABLE `Job` DROP FOREIGN KEY `Job_aiAgentId_fkey`;

-- DropForeignKey
ALTER TABLE `Job` DROP FOREIGN KEY `Job_teamId_fkey`;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
