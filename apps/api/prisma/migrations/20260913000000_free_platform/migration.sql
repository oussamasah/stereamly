CREATE TABLE "ViewingBinding" (
 "id" TEXT NOT NULL, "target" TEXT NOT NULL, "label" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "url" TEXT NOT NULL, "countries" TEXT[] NOT NULL,
 "evidenceUrl" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
 "expiresAt" TIMESTAMP(3) NOT NULL, "checkedAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ViewingBinding_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ViewingBinding_target_enabled_idx" ON "ViewingBinding"("target", "enabled");
CREATE TABLE "SportsEvent" (
 "id" TEXT NOT NULL, "title" TEXT NOT NULL, "sport" TEXT NOT NULL,
 "competition" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'SCHEDULED', "published" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SportsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SportsEvent_published_startsAt_idx" ON "SportsEvent"("published", "startsAt");
CREATE TABLE "DiscoveryCollection" (
 "id" TEXT NOT NULL, "names" JSONB NOT NULL, "targets" TEXT[] NOT NULL,
 "position" INTEGER NOT NULL DEFAULT 0, "published" BOOLEAN NOT NULL DEFAULT false,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DiscoveryCollection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlatformAudit" (
 "id" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "entityId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PlatformAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformAudit_createdAt_idx" ON "PlatformAudit"("createdAt");
