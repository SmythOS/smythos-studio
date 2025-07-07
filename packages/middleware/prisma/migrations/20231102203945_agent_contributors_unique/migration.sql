/*
  Warnings:

  - A unique constraint covering the columns `[userId,aiAgentId]` on the table `AiAgentContributor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `AiAgentContributor_userId_aiAgentId_key` ON `AiAgentContributor`(`userId`, `aiAgentId`);
