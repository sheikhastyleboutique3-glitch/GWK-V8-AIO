-- Menu time scheduling: products can have availability windows
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "scheduleStart" TEXT; -- HH:MM format
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "scheduleEnd" TEXT;   -- HH:MM format
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "scheduleDays" INTEGER[] DEFAULT '{}'; -- 0=Sun..6=Sat
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "autoEightySixed" BOOLEAN NOT NULL DEFAULT false; -- set by auto-86 system
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "autoEightySixReason" TEXT; -- e.g. "Low stock: Flour"
