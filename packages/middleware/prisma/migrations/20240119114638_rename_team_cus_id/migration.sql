/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Team` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Team_stripeCustomerId_idx` ON `Team`;


-- RenameTable
ALTER TABLE `Team` CHANGE COLUMN `stripeCustomerId` `externalCustomerId` VARCHAR(191) NULL;


-- CreateIndex
CREATE INDEX `Team_externalCustomerId_idx` ON `Team`(`externalCustomerId`);
