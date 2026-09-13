-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_packageId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelAvailability" DROP CONSTRAINT "ChannelAvailability_channelId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerDevice" DROP CONSTRAINT "CustomerDevice_userId_fkey";

-- DropForeignKey
ALTER TABLE "Entitlement" DROP CONSTRAINT "Entitlement_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "EpgChannelMapping" DROP CONSTRAINT "EpgChannelMapping_channelId_fkey";

-- DropForeignKey
ALTER TABLE "EpgChannelMapping" DROP CONSTRAINT "EpgChannelMapping_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "EpgImportRun" DROP CONSTRAINT "EpgImportRun_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "EpgProgram" DROP CONSTRAINT "EpgProgram_channelId_fkey";

-- DropForeignKey
ALTER TABLE "EpgProgram" DROP CONSTRAINT "EpgProgram_mappingId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_packageId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentEvent" DROP CONSTRAINT "PaymentEvent_orderId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramReminder" DROP CONSTRAINT "ProgramReminder_programId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramReminder" DROP CONSTRAINT "ProgramReminder_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_packageId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "StreamProvider_slug_key" ON "StreamProvider"("slug");

-- CreateIndex
CREATE INDEX "StreamProvider_category_isActive_rank_idx" ON "StreamProvider"("category", "isActive", "rank");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDevice" ADD CONSTRAINT "CustomerDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpgChannelMapping" ADD CONSTRAINT "EpgChannelMapping_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpgChannelMapping" ADD CONSTRAINT "EpgChannelMapping_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpgImportRun" ADD CONSTRAINT "EpgImportRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpgProgram" ADD CONSTRAINT "EpgProgram_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "EpgChannelMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpgProgram" ADD CONSTRAINT "EpgProgram_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramReminder" ADD CONSTRAINT "ProgramReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramReminder" ADD CONSTRAINT "ProgramReminder_programId_fkey" FOREIGN KEY ("programId") REFERENCES "EpgProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelAvailability" ADD CONSTRAINT "ChannelAvailability_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
