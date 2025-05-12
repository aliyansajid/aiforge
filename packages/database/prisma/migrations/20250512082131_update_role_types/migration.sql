/*
  Warnings:

  - The values [MODERATOR,CREATOR,SUPPORTER,CONTRIBUTOR] on the enum `RoleTypes` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleTypes_new" AS ENUM ('USER', 'DEVELOPER', 'ADMIN');
ALTER TABLE "Role" ALTER COLUMN "role" TYPE "RoleTypes_new" USING ("role"::text::"RoleTypes_new");
ALTER TYPE "RoleTypes" RENAME TO "RoleTypes_old";
ALTER TYPE "RoleTypes_new" RENAME TO "RoleTypes";
DROP TYPE "RoleTypes_old";
COMMIT;
