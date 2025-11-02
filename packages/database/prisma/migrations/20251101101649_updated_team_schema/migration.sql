/*
  Warnings:

  - You are about to drop the column `icon` on the `Team` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Team" DROP COLUMN "icon",
ADD COLUMN     "image" TEXT;
