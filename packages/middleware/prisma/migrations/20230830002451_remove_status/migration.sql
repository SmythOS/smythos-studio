/*
  Warnings:

  - The values [REJECTED] on the enum `TeamInvitation_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `TeamInvitation` MODIFY `status` ENUM('PENDING', 'ACCEPTED') NOT NULL DEFAULT 'PENDING';
