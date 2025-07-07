/*
  Warnings:

  - Added the required column `teamId` to the `TaskStats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TaskStats` ADD COLUMN `teamId` VARCHAR(191) NOT NULL;
