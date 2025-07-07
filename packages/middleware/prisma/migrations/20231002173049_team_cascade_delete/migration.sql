-- DropForeignKey
ALTER TABLE `UserTeamRole` DROP FOREIGN KEY `UserTeamRole_roleId_fkey`;

-- AddForeignKey
ALTER TABLE `UserTeamRole` ADD CONSTRAINT `UserTeamRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `TeamRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
