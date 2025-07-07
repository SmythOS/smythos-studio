-- AlterTable
ALTER TABLE `AiAgent` MODIFY `description` MEDIUMTEXT NULL;

-- AlterTable
ALTER TABLE `AiPlugin` MODIFY `description` MEDIUMTEXT NOT NULL;

-- AlterTable
ALTER TABLE `Plan` MODIFY `description` MEDIUMTEXT NULL,
    MODIFY `HTMLDescription` MEDIUMTEXT NULL,
    MODIFY `HTMLFeatures` MEDIUMTEXT NULL;
