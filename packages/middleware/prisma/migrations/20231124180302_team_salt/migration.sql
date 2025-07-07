/*
  Warnings:

  - A unique constraint covering the columns `[salt]` on the table `Team` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Team` ADD COLUMN `salt` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Team_salt_key` ON `Team`(`salt`);
