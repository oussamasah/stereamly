ALTER TABLE "ImportJob"
ADD COLUMN "workerId" TEXT,
ADD COLUMN "heartbeatAt" TIMESTAMP(3),
ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
ADD COLUMN "checkpoint" JSONB,
ADD COLUMN "processedItems" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ImportJob_status_leaseExpiresAt_idx" ON "ImportJob"("status", "leaseExpiresAt");
