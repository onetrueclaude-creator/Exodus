-- AlterTable: server-resolved testnet wallet index (sub-project B2)
ALTER TABLE "User" ADD COLUMN "chainWalletIndex" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_chainWalletIndex_key" ON "User"("chainWalletIndex");
