/*
  Warnings:

  - You are about to drop the column `contactId` on the `Message` table. All the data in the column will be lost.
  - Added the required column `receiverId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_contactId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "contactId",
ADD COLUMN     "receiverId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
