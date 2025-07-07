/*
  Warnings:

  - A unique constraint covering the columns `[salt]` on the table `AiAgent` will be added. If there are existing duplicate values, this will fail.
  - Made the column `salt` on table `AiAgent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `AiAgent` MODIFY `salt` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `AiAgent_salt_key` ON `AiAgent`(`salt`);
