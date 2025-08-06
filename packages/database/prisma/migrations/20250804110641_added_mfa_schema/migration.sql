/*
  Warnings:

  - You are about to drop the column `lastUsed` on the `MfaDevice` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `MfaDevice` table. All the data in the column will be lost.
  - You are about to drop the column `backupCodes` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mfaEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mfaSecret` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MfaDevice" DROP COLUMN "lastUsed",
DROP COLUMN "verified";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "backupCodes",
DROP COLUMN "mfaEnabled",
DROP COLUMN "mfaSecret",
ADD COLUMN     "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false;
