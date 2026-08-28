-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarStoredName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarStoredName_key" ON "User"("avatarStoredName");
