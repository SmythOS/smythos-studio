/*
  Warnings:

  - You are about to drop the column `canBeRemoved` on the `TeamRole` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TeamRole` DROP COLUMN `canBeRemoved`,
    ADD COLUMN `isOwnerRole` BOOLEAN NOT NULL DEFAULT false;
