-- CreateTable
CREATE TABLE `TeamMembership` (
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `userSpecificAcl` JSON NULL,
    `isTeamInitiator` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `TeamMembership_userId_key`(`userId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamMembership` ADD CONSTRAINT `TeamMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMembership` ADD CONSTRAINT `TeamMembership_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `TeamRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
