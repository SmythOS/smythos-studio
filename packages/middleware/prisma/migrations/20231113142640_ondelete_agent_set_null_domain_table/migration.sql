-- DropForeignKey
ALTER TABLE `Domain` DROP FOREIGN KEY `Domain_aiAgentId_fkey`;

-- AddForeignKey
ALTER TABLE `Domain` ADD CONSTRAINT `Domain_aiAgentId_fkey` FOREIGN KEY (`aiAgentId`) REFERENCES `AiAgent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
