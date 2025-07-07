/*
  Warnings:

  - You are about to alter the column `majorVersion` on the `AiAgentDeployment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `minorVersion` on the `AiAgentDeployment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `AiAgentDeployment` MODIFY `majorVersion` INTEGER NOT NULL,
    MODIFY `minorVersion` INTEGER NOT NULL;
