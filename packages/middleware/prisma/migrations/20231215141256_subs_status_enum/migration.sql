/*
  Warnings:

  - Made the column `status` on table `Subscription` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Subscription` MODIFY `status` ENUM('ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'TRIALING') NOT NULL;
