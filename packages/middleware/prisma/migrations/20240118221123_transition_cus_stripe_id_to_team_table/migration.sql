/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `User_stripeCustomerId_idx` ON `User`;

-- AlterTable
ALTER TABLE `Team` ADD COLUMN `stripeCustomerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `stripeCustomerId`;

-- CreateIndex
CREATE INDEX `Team_stripeCustomerId_idx` ON `Team`(`stripeCustomerId`);
