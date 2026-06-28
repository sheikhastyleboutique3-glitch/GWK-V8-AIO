-- Performance indexes for analytics and KDS queries
CREATE INDEX IF NOT EXISTS "orders_completedAt_idx" ON "orders" ("completedAt");
CREATE INDEX IF NOT EXISTS "orders_branchId_status_completedAt_idx" ON "orders" ("branchId", "status", "completedAt");
CREATE INDEX IF NOT EXISTS "orders_sessionId_status_idx" ON "orders" ("sessionId", "status");
CREATE INDEX IF NOT EXISTS "order_items_orderId_isVoided_idx" ON "order_items" ("orderId", "isVoided");
CREATE INDEX IF NOT EXISTS "order_items_firedAt_kdsStatus_idx" ON "order_items" ("firedAt", "kdsStatus");
