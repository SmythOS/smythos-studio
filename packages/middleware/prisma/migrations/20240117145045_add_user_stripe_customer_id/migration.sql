-- AlterTable
ALTER TABLE `User` ADD COLUMN `stripeCustomerId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `User_stripeCustomerId_idx` ON `User`(`stripeCustomerId`);
