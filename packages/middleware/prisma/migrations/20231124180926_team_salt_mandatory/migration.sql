/*
  Warnings:

  - Made the column `salt` on table `Team` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Team` MODIFY `salt` VARCHAR(191) NOT NULL;
