-- REMOVE THE CONSTRAINT BEFORE DROPPING THE INDEX
ALTER TABLE `Team` DROP FOREIGN KEY `Team_subscriptionId_fkey`;

-- DROP UNIQUE INDEX from Team table
-- PROVIDER = MYSQL
ALTER TABLE `Team` DROP INDEX `Team_subscriptionId_key`;

-- CREATE NEW NON-UNIQUE INDEX on Team table 'subscriptionId' column
-- PROVIDER = MYSQL
-- CREATE INDEX `Team_subscriptionId` ON `Team`(`subscriptionId`);

ALTER TABLE `Team` ADD CONSTRAINT `Team_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
