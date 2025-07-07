-- REMOVE THE CONSTRAINT BEFORE DROPPING THE INDEX
ALTER TABLE `TeamMembership` DROP FOREIGN KEY `TeamMembership_userId_fkey`;

-- DROP UNIQUE INDEX from Team table
-- PROVIDER = MYSQL
ALTER TABLE `TeamMembership` DROP INDEX `TeamMembership_userId_key`;

-- PROVIDER = MYSQL
-- CREATE INDEX `Team_subscriptionId` ON `Team`(`subscriptionId`);

-- AddForeignKey
ALTER TABLE `TeamMembership` ADD CONSTRAINT `TeamMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


