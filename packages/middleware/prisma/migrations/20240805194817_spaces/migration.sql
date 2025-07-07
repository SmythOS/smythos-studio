-- AlterTable
ALTER TABLE `AiAgent` ADD COLUMN `spaceId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Space` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `description` MEDIUMTEXT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `acl` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpaceMembership` (
    `userId` INTEGER NOT NULL,
    `spaceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`, `spaceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiAgent` ADD CONSTRAINT `AiAgent_spaceId_fkey` FOREIGN KEY (`spaceId`) REFERENCES `Space`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Space` ADD CONSTRAINT `Space_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Space` ADD CONSTRAINT `Space_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpaceMembership` ADD CONSTRAINT `SpaceMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpaceMembership` ADD CONSTRAINT `SpaceMembership_spaceId_fkey` FOREIGN KEY (`spaceId`) REFERENCES `Space`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
