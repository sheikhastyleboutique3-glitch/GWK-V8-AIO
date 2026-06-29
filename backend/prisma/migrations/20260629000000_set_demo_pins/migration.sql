-- Set demo POS PINs for existing users (only if posPin is currently NULL)
-- These match the credentials documented in the README.
UPDATE "users" SET "posPin" = '1111' WHERE "email" = 'admin@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '2222' WHERE "email" = 'manager.d@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '3333' WHERE "email" = 'cashier@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '4444' WHERE "email" = 'waiter@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '5555' WHERE "email" = 'kitchen@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '6666' WHERE "email" = 'barista@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '7777' WHERE "email" = 'procurement@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '8888' WHERE "email" = 'warehouse@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '9999' WHERE "email" = 'manager.w@gwk.com' AND "posPin" IS NULL;
UPDATE "users" SET "posPin" = '1234' WHERE "email" = 'pastry@gwk.com' AND "posPin" IS NULL;
