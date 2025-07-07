-- REMOVE THE CONSTRAINT BEFORE DROPPING THE INDEX
ALTER TABLE `UserTeamRole` DROP FOREIGN KEY `UserTeamRole_userId_fkey`;

-- DROP UNIQUE INDEX from Team table
-- PROVIDER = MYSQL
ALTER TABLE `UserTeamRole` DROP INDEX `UserTeamRole_userId_key`;

-- PROVIDER = MYSQL
-- CREATE INDEX `Team_subscriptionId` ON `Team`(`subscriptionId`);

-- AddForeignKey
ALTER TABLE `UserTeamRole` ADD CONSTRAINT `UserTeamRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


