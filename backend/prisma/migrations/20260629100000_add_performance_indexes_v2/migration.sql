-- Performance indexes identified by the full system audit (June 2026)

-- 1. Inventory FEFO allocation queries always filter by (productId, branchId)
CREATE INDEX IF NOT EXISTS "inventory_productId_branchId_idx" ON "inventory" ("productId", "branchId");

-- 2. Financial reports filter by branch + date range
CREATE INDEX IF NOT EXISTS "finance_entries_branchId_occurredAt_idx" ON "finance_entries" ("branchId", "occurredAt");

-- 3. Audit trail lookups by entity + entityId
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entityId_idx" ON "audit_logs" ("entity", "entityId");

-- 4. Notification bell badge count query (userId, isRead, createdAt)
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx" ON "notifications" ("userId", "isRead", "createdAt");

-- 5. Customer search by phone (common in Qatar)
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers" ("phone");
