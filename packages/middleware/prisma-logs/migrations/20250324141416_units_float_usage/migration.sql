/*
  Warnings:

  - You are about to alter the column `units` on the `Usage` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `Usage` MODIFY `units` DOUBLE NOT NULL;
