-- CreateTable
CREATE TABLE `TaskStats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agentId` VARCHAR(191) NOT NULL,
    `day` DATETIME(3) NOT NULL,
    `number` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
