-- CreateTable
CREATE TABLE `PaymentLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `paymentIdentifier` VARCHAR(191) NULL,
    `error` VARCHAR(191) NULL,
    `logs` JSON NULL,
    `paymentObject` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
