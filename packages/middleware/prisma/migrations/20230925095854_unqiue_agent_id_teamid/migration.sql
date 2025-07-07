/*
  Warnings:

  - A unique constraint covering the columns `[teamId,id]` on the table `AiAgent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `AiAgent_teamId_id_key` ON `AiAgent`(`teamId`, `id`);
