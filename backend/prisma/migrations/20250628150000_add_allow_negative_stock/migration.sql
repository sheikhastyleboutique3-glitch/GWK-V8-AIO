-- Add allowNegativeStock column to products table
-- Per-product override: allow selling even when stock = 0
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false;
