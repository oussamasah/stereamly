CREATE TABLE "StreamProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "movieTemplate" TEXT,
    "tvTemplate" TEXT,
    "streamUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StreamProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StreamProvider_slug_key" ON "StreamProvider"("slug");
CREATE INDEX "StreamProvider_category_isActive_rank_idx" ON "StreamProvider"("category", "isActive", "rank");