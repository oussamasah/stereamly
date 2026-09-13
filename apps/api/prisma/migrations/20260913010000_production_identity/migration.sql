ALTER TABLE "User" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "ViewerLibraryItem" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "target" TEXT NOT NULL,
 "saved" BOOLEAN NOT NULL DEFAULT true, "positionSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ViewerLibraryItem_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ViewerLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ViewerLibraryItem_userId_target_key" ON "ViewerLibraryItem"("userId", "target");
CREATE INDEX "ViewerLibraryItem_userId_updatedAt_idx" ON "ViewerLibraryItem"("userId", "updatedAt");
