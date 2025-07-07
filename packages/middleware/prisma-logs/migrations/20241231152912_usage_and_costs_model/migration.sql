-- CreateTable
CREATE TABLE `Usage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `day` DATETIME(3) NOT NULL,
    `units` INTEGER NOT NULL,
    `class` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `cost` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Usage_day_class_agentId_sourceId_idx`(`day`, `class`, `agentId`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Costs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sourceId` VARCHAR(191) NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
