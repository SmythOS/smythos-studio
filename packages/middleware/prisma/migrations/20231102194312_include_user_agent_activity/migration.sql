-- AlterTable
ALTER TABLE `AiAgentActivity` ADD COLUMN `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `AiAgentActivity` ADD CONSTRAINT `AiAgentActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
