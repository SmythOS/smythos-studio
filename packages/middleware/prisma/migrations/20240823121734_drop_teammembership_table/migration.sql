/*
  Warnings:

  - You are about to drop the `TeamMembership` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `TeamMembership` DROP FOREIGN KEY `TeamMembership_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `TeamMembership` DROP FOREIGN KEY `TeamMembership_userId_fkey`;

-- DropTable
DROP TABLE `TeamMembership`;
