-- AlterTable: Add kitchen recall fields to order_items for Odoo-style Kitchen Recall feature
ALTER TABLE "order_items" ADD COLUMN "recalledAt" TIMESTAMP(3);
ALTER TABLE "order_items" ADD COLUMN "recalledById" INTEGER;
ALTER TABLE "order_items" ADD COLUMN "recallReason" TEXT;
