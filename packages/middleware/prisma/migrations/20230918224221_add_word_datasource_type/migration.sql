/*
  Warnings:

  - The values [DOCUMENT] on the enum `DataSource_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `DataSource` MODIFY `type` ENUM('PDF', 'SITEMAP', 'WEBPAGE', 'WORD') NOT NULL;
