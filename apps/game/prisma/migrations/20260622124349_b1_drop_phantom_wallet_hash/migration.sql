/*
  Warnings:

  - You are about to drop the column `phantomWalletHash` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_phantomWalletHash_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phantomWalletHash";
