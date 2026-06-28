-- Multi-currency exchange rates
CREATE TABLE IF NOT EXISTS "currency_rates" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "nameAr" TEXT,
  "symbol" TEXT NOT NULL,
  "rateToBase" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed common currencies for Qatar
INSERT INTO "currency_rates" ("code", "name", "nameAr", "symbol", "rateToBase", "isActive", "updatedAt") VALUES
  ('QAR', 'Qatari Riyal', 'ريال قطري', 'ر.ق', 1.0, true, NOW()),
  ('USD', 'US Dollar', 'دولار أمريكي', '$', 3.64, true, NOW()),
  ('EUR', 'Euro', 'يورو', '€', 3.98, true, NOW()),
  ('GBP', 'British Pound', 'جنيه إسترليني', '£', 4.62, true, NOW()),
  ('SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', 0.97, true, NOW()),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 0.99, true, NOW()),
  ('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', 11.85, true, NOW()),
  ('BHD', 'Bahraini Dinar', 'دينار بحريني', 'د.ب', 9.65, true, NOW()),
  ('OMR', 'Omani Rial', 'ريال عماني', 'ر.ع', 9.45, true, NOW())
ON CONFLICT ("code") DO NOTHING;

-- Staff shift scheduling
CREATE TABLE IF NOT EXISTS "staff_shifts" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "scheduledStart" TIMESTAMP(3) NOT NULL,
  "scheduledEnd" TIMESTAMP(3) NOT NULL,
  "actualStart" TIMESTAMP(3),
  "actualEnd" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "staff_shifts_userId_scheduledStart_idx" ON "staff_shifts" ("userId", "scheduledStart");
CREATE INDEX IF NOT EXISTS "staff_shifts_branchId_scheduledStart_idx" ON "staff_shifts" ("branchId", "scheduledStart");

-- Driver GPS tracking
CREATE TABLE IF NOT EXISTS "driver_locations" (
  "id" SERIAL PRIMARY KEY,
  "driverId" INTEGER NOT NULL,
  "deliveryId" INTEGER,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "heading" DOUBLE PRECISION,
  "speed" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "driver_locations_driverId_recordedAt_idx" ON "driver_locations" ("driverId", "recordedAt");
CREATE INDEX IF NOT EXISTS "driver_locations_deliveryId_idx" ON "driver_locations" ("deliveryId");
