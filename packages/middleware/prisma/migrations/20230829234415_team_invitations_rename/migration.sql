/*
  Warnings:

  - You are about to drop the `Invitation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Invitation` DROP FOREIGN KEY `Invitation_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `Invitation` DROP FOREIGN KEY `Invitation_teamId_fkey`;

-- DropTable
DROP TABLE `Invitation`;

-- CreateTable
CREATE TABLE `TeamInvitation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `teamId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `code` VARCHAR(191) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `teamRoleId` INTEGER NOT NULL,

    UNIQUE INDEX `TeamInvitation_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamInvitation` ADD CONSTRAINT `TeamInvitation_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamInvitation` ADD CONSTRAINT `TeamInvitation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamInvitation` ADD CONSTRAINT `TeamInvitation_teamRoleId_fkey` FOREIGN KEY (`teamRoleId`) REFERENCES `TeamRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
