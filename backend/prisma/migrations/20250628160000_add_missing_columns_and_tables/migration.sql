-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix: Add columns and tables that exist in the Prisma schema but were never
-- migrated to the database. Discovered via full schema-vs-migration audit.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. User.themePreferences (JSON field for per-user UI preferences)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "themePreferences" JSONB;

-- 2. Order.shipLater (Odoo: customer pays now, delivery scheduled later)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipLater" BOOLEAN NOT NULL DEFAULT false;

-- 3. Order.fulfillmentDate (scheduled delivery/pickup date for Ship Later orders)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfillmentDate" TIMESTAMP(3);

-- 4. UserView table (saved filter/grouping views per user per page)
CREATE TABLE IF NOT EXISTS "user_views" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "pageId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filters" JSONB NOT NULL DEFAULT '{}',
  "groupBy" JSONB NOT NULL DEFAULT '[]',
  "columns" JSONB,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
