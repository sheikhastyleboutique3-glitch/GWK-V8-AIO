-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT', 'WAREHOUSE', 'KITCHEN', 'BARISTA', 'PASTRY', 'CASHIER', 'CLEANER', 'WAITER', 'DRIVER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'MANAGER_MODIFIED', 'MANAGER_CANCELLED', 'ORDER_PLACED_WITH_SUPPLIER', 'RECEIVED_AT_WAREHOUSE', 'DISPATCHED_TO_BRANCH', 'CONFIRMED_RECEIPT');

-- CreateEnum
CREATE TYPE "WastageReason" AS ENUM ('EXPIRED', 'DAMAGED', 'SPILLAGE', 'OVERPRODUCTION', 'QUALITY_REJECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('EXPIRY_WARNING', 'LOW_STOCK', 'WASTAGE_THRESHOLD');

-- CreateEnum
CREATE TYPE "InventoryTxType" AS ENUM ('RECEIPT', 'REQUISITION_FULFILLMENT', 'WASTAGE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'PRODUCTION_CONSUME', 'PRODUCTION_YIELD', 'RETURN_IN');

-- CreateEnum
CREATE TYPE "ExpiryTrackingType" AS ENUM ('SHELF_LIFE_DAYS', 'MANUFACTURE_TO_EXPIRY');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RAW', 'SEMI_FINISHED', 'MENU');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('USB', 'IP', 'IOT');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR', 'TALABAT', 'SNOONU', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'HELD', 'READY', 'PAID', 'DONE', 'INVOICED', 'VOIDED', 'REFUNDED', 'OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'WALLET', 'QR', 'STORE_CREDIT', 'LOYALTY', 'GIFT_CARD', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'BANK', 'WALLET', 'AGGREGATOR', 'GIFT_CARD', 'LOYALTY', 'STORE_CREDIT');

-- CreateEnum
CREATE TYPE "KdsStatus" AS ENUM ('QUEUED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('SALE_REVENUE', 'COGS', 'TAX', 'SERVICE_CHARGE', 'TIP', 'PURCHASE', 'WASTAGE', 'PRODUCTION_COST', 'REFUND', 'PAYMENT', 'CASH_DIFFERENCE', 'COMMISSION');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('BOOKED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'BILL_REQUESTED');

-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('SQUARE', 'ROUND', 'RECTANGLE');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('ORDER', 'ITEM', 'CATEGORY');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED', 'BOGO');

-- CreateEnum
CREATE TYPE "StaffTaskCategory" AS ENUM ('CLEANING', 'MAINTENANCE', 'OPENING', 'CLOSING', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('OPENING_CONTROL', 'OPEN', 'CLOSING_CONTROL', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashCountPhase" AS ENUM ('OPENING', 'CLOSING');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "SalesQuoteStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxComputation" AS ENUM ('PERCENT_EXCLUDED', 'PERCENT_INCLUDED');

-- CreateEnum
CREATE TYPE "PricelistType" AS ENUM ('BASE', 'CUSTOMER_GROUP', 'TIME_WINDOW');

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isWarehouse" BOOLEAN NOT NULL DEFAULT false,
    "cashFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "crNumber" TEXT,
    "baladiyaLicenseNo" TEXT,
    "licenseExpiryDate" TIMESTAMP(3),
    "isEnforcedLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstNameAr" TEXT,
    "lastNameAr" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "branchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_branches" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "icon" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPosVisible" BOOLEAN NOT NULL DEFAULT true,
    "station" TEXT,
    "printerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "connection" "ConnectionType" NOT NULL DEFAULT 'IP',
    "ipAddress" TEXT,
    "port" INTEGER DEFAULT 9100,
    "usbPort" TEXT,
    "widthMm" INTEGER NOT NULL DEFAULT 80,
    "branchId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "abbreviation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "imageUrl" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryId" INTEGER,
    "unitId" INTEGER,
    "minStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderPoint" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supplierId" INTEGER,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxCategory" TEXT,
    "yieldFactor" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isSellable" BOOLEAN NOT NULL DEFAULT true,
    "productType" "ProductType" NOT NULL DEFAULT 'MENU',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "tracksExpiry" BOOLEAN NOT NULL DEFAULT false,
    "expiryTrackingType" "ExpiryTrackingType",
    "shelfLifeDays" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergenNotes" TEXT,
    "allergenNotesAr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computation" "TaxComputation" NOT NULL DEFAULT 'PERCENT_EXCLUDED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_taxes" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "taxRateId" INTEGER NOT NULL,

    CONSTRAINT "product_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricelists" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PricelistType" NOT NULL DEFAULT 'BASE',
    "currency" TEXT NOT NULL DEFAULT 'QAR',
    "group" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricelist_items" (
    "id" SERIAL NOT NULL,
    "pricelistId" INTEGER NOT NULL,
    "productId" INTEGER,
    "categoryId" INTEGER,
    "fixedPrice" DOUBLE PRECISION,
    "percentPrice" DOUBLE PRECISION,
    "minQty" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "pricelist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_lines" (
    "id" SERIAL NOT NULL,
    "comboId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "minSelect" INTEGER NOT NULL DEFAULT 1,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_choices" (
    "id" SERIAL NOT NULL,
    "comboLineId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "priceExtra" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "combo_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manufactureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "batchNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "manufactureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedAtBranchId" INTEGER,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_orders" (
    "id" SERIAL NOT NULL,
    "transferNo" TEXT NOT NULL,
    "fromBranchId" INTEGER NOT NULL,
    "toBranchId" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" INTEGER,
    "receivedById" INTEGER,
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_items" (
    "id" SERIAL NOT NULL,
    "transferOrderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "transfer_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "type" "InventoryTxType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "performedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitions" (
    "id" SERIAL NOT NULL,
    "requisitionNo" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "notesAr" TEXT,
    "neededBy" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "processedById" INTEGER,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_items" (
    "id" SERIAL NOT NULL,
    "requisitionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "requestedQty" DOUBLE PRECISION NOT NULL,
    "approvedQty" DOUBLE PRECISION,
    "receivedQty" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_status_history" (
    "id" SERIAL NOT NULL,
    "requisitionId" INTEGER NOT NULL,
    "status" "RequisitionStatus" NOT NULL,
    "changedById" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requisition_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_dispatches" (
    "id" SERIAL NOT NULL,
    "requisitionId" INTEGER NOT NULL,
    "destinationBranchId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "recipientName" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "trackingNotes" TEXT,

    CONSTRAINT "requisition_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNo" TEXT,
    "vehicle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "paymentTerms" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "requisitionId" INTEGER,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'QAR',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "orderedQty" DOUBLE PRECISION NOT NULL,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wastage_records" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" "WastageReason" NOT NULL,
    "notes" TEXT,
    "loggedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wastage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "message" TEXT NOT NULL,
    "messageAr" TEXT,
    "branchId" INTEGER,
    "productId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_reset_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "resetType" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_reset_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_price_history" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "oldPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "changedById" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_configs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'notifications',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNumber" TEXT,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'requisitions',
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "message" TEXT NOT NULL,
    "messageAr" TEXT,
    "entityType" TEXT,
    "entityId" INTEGER,
    "link" TEXT,
    "branchId" INTEGER,
    "actorId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_configs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "defaultFloorId" INTEGER,
    "allowSplitBill" BOOLEAN NOT NULL DEFAULT true,
    "allowTableMove" BOOLEAN NOT NULL DEFAULT true,
    "iface" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_floors" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "background" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "floorId" INTEGER,
    "name" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 2,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "shape" "TableShape" NOT NULL DEFAULT 'SQUARE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_displays" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "printerId" INTEGER,
    "categoryIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preparation_displays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_configs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" "PaymentMethodType" NOT NULL DEFAULT 'CASH',
    "isCashCount" BOOLEAN NOT NULL DEFAULT false,
    "opensDrawer" BOOLEAN NOT NULL DEFAULT false,
    "deliveryPlatformId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_platforms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL DEFAULT 'AGGREGATOR',
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payoutTermDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "yieldQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "yieldUnitId" INTEGER,
    "prepLossPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cookingLossPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "notesAr" TEXT,
    "imageUrl" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_components" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "componentProductId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitId" INTEGER,
    "wastePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "recipe_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "group" TEXT,
    "loyaltyPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "birthday" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_rules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "scope" "DiscountScope" NOT NULL DEFAULT 'ORDER',
    "type" "DiscountType" NOT NULL DEFAULT 'PERCENT',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categoryId" INTEGER,
    "productId" INTEGER,
    "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "orderNo" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "channel" "OrderChannel" NOT NULL DEFAULT 'DINE_IN',
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "customerId" INTEGER,
    "tableId" INTEGER,
    "tableName" TEXT,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "sessionId" INTEGER,
    "posConfigId" INTEGER,
    "parentOrderId" INTEGER,
    "refundedOrderId" INTEGER,
    "couponCode" TEXT,
    "couponDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountRuleId" INTEGER,
    "ruleDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "deliveryPlatformId" INTEGER,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformRef" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "foodCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modifiers" JSONB,
    "seat" INTEGER,
    "courseNo" INTEGER NOT NULL DEFAULT 1,
    "kdsStatus" "KdsStatus" NOT NULL DEFAULT 'QUEUED',
    "firedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "voidedById" INTEGER,
    "voidedAt" TIMESTAMP(3),
    "refundedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_table_moves" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "fromTableId" INTEGER,
    "toTableId" INTEGER,
    "movedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_table_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "methodConfigId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversedAt" TIMESTAMP(3),
    "receivedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" SERIAL NOT NULL,
    "sessionNo" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "posConfigId" INTEGER,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'OPENING_CONTROL',
    "openingFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedCash" DOUBLE PRECISION,
    "closingCounted" DOUBLE PRECISION,
    "cashDifference" DOUBLE PRECISION,
    "openedById" INTEGER,
    "closedById" INTEGER,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_cash_counts" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "phase" "CashCountPhase" NOT NULL,
    "totalCounted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_cash_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_cash_count_lines" (
    "id" SERIAL NOT NULL,
    "cashCountId" INTEGER NOT NULL,
    "denomination" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "pos_cash_count_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_cash_movements" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" SERIAL NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'QAR',
    "branchId" INTEGER,
    "sourceType" TEXT,
    "sourceId" INTEGER,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" SERIAL NOT NULL,
    "productionNo" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "recipeId" INTEGER,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "producedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'PLANNED',
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_consumptions" (
    "id" SERIAL NOT NULL,
    "productionOrderId" INTEGER NOT NULL,
    "componentProductId" INTEGER NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineCost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "production_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "tableId" INTEGER,
    "customerId" INTEGER,
    "customerName" TEXT,
    "phone" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 2,
    "reservedAt" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'BOOKED',
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "customerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_tasks" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "category" "StaffTaskCategory" NOT NULL DEFAULT 'CLEANING',
    "status" "StaffTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "StaffTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedToId" INTEGER,
    "createdById" INTEGER,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checklist" JSONB,
    "recurrence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_options" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "priceDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "componentProductId" INTEGER,
    "qtyToDeduct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_modifier_groups" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_deliveries" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "address" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quotes" (
    "id" SERIAL NOT NULL,
    "quoteNo" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "status" "SalesQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderId" INTEGER,
    "validUntil" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quote_items" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "sales_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_counts" (
    "id" SERIAL NOT NULL,
    "countNo" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalVarianceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" SERIAL NOT NULL,
    "countId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "systemQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_branches_userId_branchId_key" ON "user_branches"("userId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_supplierId_idx" ON "products"("supplierId");

-- CreateIndex
CREATE INDEX "products_isActive_isArchived_idx" ON "products"("isActive", "isArchived");

-- CreateIndex
CREATE INDEX "products_productType_isSellable_idx" ON "products"("productType", "isSellable");

-- CreateIndex
CREATE INDEX "product_taxes_taxRateId_idx" ON "product_taxes"("taxRateId");

-- CreateIndex
CREATE UNIQUE INDEX "product_taxes_productId_taxRateId_key" ON "product_taxes"("productId", "taxRateId");

-- CreateIndex
CREATE INDEX "pricelist_items_pricelistId_idx" ON "pricelist_items"("pricelistId");

-- CreateIndex
CREATE INDEX "combo_lines_comboId_idx" ON "combo_lines"("comboId");

-- CreateIndex
CREATE INDEX "combo_choices_comboLineId_idx" ON "combo_choices"("comboLineId");

-- CreateIndex
CREATE INDEX "inventory_productId_branchId_idx" ON "inventory"("productId", "branchId");

-- CreateIndex
CREATE INDEX "inventory_expiryDate_idx" ON "inventory"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_branchId_batchId_key" ON "inventory"("productId", "branchId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchNumber_key" ON "batches"("batchNumber");

-- CreateIndex
CREATE INDEX "batches_productId_expiryDate_idx" ON "batches"("productId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_orders_transferNo_key" ON "transfer_orders"("transferNo");

-- CreateIndex
CREATE INDEX "transfer_orders_fromBranchId_status_idx" ON "transfer_orders"("fromBranchId", "status");

-- CreateIndex
CREATE INDEX "transfer_orders_toBranchId_status_idx" ON "transfer_orders"("toBranchId", "status");

-- CreateIndex
CREATE INDEX "transfer_orders_status_idx" ON "transfer_orders"("status");

-- CreateIndex
CREATE INDEX "transfer_order_items_transferOrderId_idx" ON "transfer_order_items"("transferOrderId");

-- CreateIndex
CREATE INDEX "transfer_order_items_productId_idx" ON "transfer_order_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_transactions_productId_branchId_idx" ON "inventory_transactions"("productId", "branchId");

-- CreateIndex
CREATE INDEX "inventory_transactions_branchId_idx" ON "inventory_transactions"("branchId");

-- CreateIndex
CREATE INDEX "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "requisitions_requisitionNo_key" ON "requisitions"("requisitionNo");

-- CreateIndex
CREATE INDEX "requisitions_branchId_status_idx" ON "requisitions"("branchId", "status");

-- CreateIndex
CREATE INDEX "requisitions_status_idx" ON "requisitions"("status");

-- CreateIndex
CREATE INDEX "requisitions_createdById_idx" ON "requisitions"("createdById");

-- CreateIndex
CREATE INDEX "requisitions_createdAt_idx" ON "requisitions"("createdAt");

-- CreateIndex
CREATE INDEX "requisition_items_requisitionId_idx" ON "requisition_items"("requisitionId");

-- CreateIndex
CREATE INDEX "requisition_items_productId_idx" ON "requisition_items"("productId");

-- CreateIndex
CREATE INDEX "requisition_status_history_requisitionId_idx" ON "requisition_status_history"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "requisition_dispatches_requisitionId_key" ON "requisition_dispatches"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_branchId_status_idx" ON "purchase_orders"("branchId", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_requisitionId_idx" ON "purchase_orders"("requisitionId");

-- CreateIndex
CREATE INDEX "wastage_records_branchId_createdAt_idx" ON "wastage_records"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "wastage_records_productId_idx" ON "wastage_records"("productId");

-- CreateIndex
CREATE INDEX "alerts_branchId_isResolved_idx" ON "alerts"("branchId", "isResolved");

-- CreateIndex
CREATE INDEX "alerts_isResolved_idx" ON "alerts"("isResolved");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_configs_key_key" ON "notification_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_userId_channel_eventType_key" ON "user_notification_preferences"("userId", "channel", "eventType");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "pos_configs_branchId_idx" ON "pos_configs"("branchId");

-- CreateIndex
CREATE INDEX "restaurant_floors_branchId_idx" ON "restaurant_floors"("branchId");

-- CreateIndex
CREATE INDEX "restaurant_tables_branchId_status_idx" ON "restaurant_tables"("branchId", "status");

-- CreateIndex
CREATE INDEX "restaurant_tables_floorId_idx" ON "restaurant_tables"("floorId");

-- CreateIndex
CREATE INDEX "preparation_displays_branchId_idx" ON "preparation_displays"("branchId");

-- CreateIndex
CREATE INDEX "recipes_productId_isActive_idx" ON "recipes"("productId", "isActive");

-- CreateIndex
CREATE INDEX "recipe_components_recipeId_idx" ON "recipe_components"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_components_componentProductId_idx" ON "recipe_components"("componentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "discount_rules_isActive_idx" ON "discount_rules"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNo_key" ON "orders"("orderNo");

-- CreateIndex
CREATE INDEX "orders_branchId_status_idx" ON "orders"("branchId", "status");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_sessionId_idx" ON "orders"("sessionId");

-- CreateIndex
CREATE INDEX "orders_tableId_idx" ON "orders"("tableId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_kdsStatus_idx" ON "order_items"("kdsStatus");

-- CreateIndex
CREATE INDEX "order_table_moves_orderId_idx" ON "order_table_moves"("orderId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_methodConfigId_idx" ON "payments"("methodConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sessions_sessionNo_key" ON "pos_sessions"("sessionNo");

-- CreateIndex
CREATE INDEX "pos_sessions_branchId_status_idx" ON "pos_sessions"("branchId", "status");

-- CreateIndex
CREATE INDEX "pos_sessions_posConfigId_idx" ON "pos_sessions"("posConfigId");

-- CreateIndex
CREATE INDEX "pos_cash_counts_sessionId_idx" ON "pos_cash_counts"("sessionId");

-- CreateIndex
CREATE INDEX "pos_cash_count_lines_cashCountId_idx" ON "pos_cash_count_lines"("cashCountId");

-- CreateIndex
CREATE INDEX "pos_cash_movements_sessionId_idx" ON "pos_cash_movements"("sessionId");

-- CreateIndex
CREATE INDEX "finance_entries_type_idx" ON "finance_entries"("type");

-- CreateIndex
CREATE INDEX "finance_entries_branchId_occurredAt_idx" ON "finance_entries"("branchId", "occurredAt");

-- CreateIndex
CREATE INDEX "finance_entries_sourceType_sourceId_idx" ON "finance_entries"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_productionNo_key" ON "production_orders"("productionNo");

-- CreateIndex
CREATE INDEX "production_orders_branchId_status_idx" ON "production_orders"("branchId", "status");

-- CreateIndex
CREATE INDEX "production_orders_productId_idx" ON "production_orders"("productId");

-- CreateIndex
CREATE INDEX "production_consumptions_productionOrderId_idx" ON "production_consumptions"("productionOrderId");

-- CreateIndex
CREATE INDEX "reservations_branchId_reservedAt_idx" ON "reservations"("branchId", "reservedAt");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "staff_tasks_branchId_status_idx" ON "staff_tasks"("branchId", "status");

-- CreateIndex
CREATE INDEX "staff_tasks_assignedToId_idx" ON "staff_tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "modifier_options_groupId_idx" ON "modifier_options"("groupId");

-- CreateIndex
CREATE INDEX "product_modifier_groups_productId_idx" ON "product_modifier_groups"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_modifier_groups_productId_groupId_key" ON "product_modifier_groups"("productId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "order_deliveries_orderId_key" ON "order_deliveries"("orderId");

-- CreateIndex
CREATE INDEX "order_deliveries_branchId_status_idx" ON "order_deliveries"("branchId", "status");

-- CreateIndex
CREATE INDEX "order_deliveries_driverId_status_idx" ON "order_deliveries"("driverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_quotes_quoteNo_key" ON "sales_quotes"("quoteNo");

-- CreateIndex
CREATE INDEX "sales_quotes_branchId_status_idx" ON "sales_quotes"("branchId", "status");

-- CreateIndex
CREATE INDEX "sales_quote_items_quoteId_idx" ON "sales_quote_items"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_counts_countNo_key" ON "stock_counts"("countNo");

-- CreateIndex
CREATE INDEX "stock_counts_branchId_idx" ON "stock_counts"("branchId");

-- CreateIndex
CREATE INDEX "stock_count_items_countId_idx" ON "stock_count_items"("countId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_taxes" ADD CONSTRAINT "product_taxes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_taxes" ADD CONSTRAINT "product_taxes_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "tax_rates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricelist_items" ADD CONSTRAINT "pricelist_items_pricelistId_fkey" FOREIGN KEY ("pricelistId") REFERENCES "pricelists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricelist_items" ADD CONSTRAINT "pricelist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricelist_items" ADD CONSTRAINT "pricelist_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_lines" ADD CONSTRAINT "combo_lines_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_choices" ADD CONSTRAINT "combo_choices_comboLineId_fkey" FOREIGN KEY ("comboLineId") REFERENCES "combo_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_choices" ADD CONSTRAINT "combo_choices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "transfer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_status_history" ADD CONSTRAINT "requisition_status_history_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_status_history" ADD CONSTRAINT "requisition_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_dispatches" ADD CONSTRAINT "requisition_dispatches_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_dispatches" ADD CONSTRAINT "requisition_dispatches_destinationBranchId_fkey" FOREIGN KEY ("destinationBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_dispatches" ADD CONSTRAINT "requisition_dispatches_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wastage_records" ADD CONSTRAINT "wastage_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wastage_records" ADD CONSTRAINT "wastage_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wastage_records" ADD CONSTRAINT "wastage_records_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wastage_records" ADD CONSTRAINT "wastage_records_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_configs" ADD CONSTRAINT "pos_configs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_floors" ADD CONSTRAINT "restaurant_floors_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "restaurant_floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_displays" ADD CONSTRAINT "preparation_displays_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_yieldUnitId_fkey" FOREIGN KEY ("yieldUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_posConfigId_fkey" FOREIGN KEY ("posConfigId") REFERENCES "pos_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_refundedOrderId_fkey" FOREIGN KEY ("refundedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_table_moves" ADD CONSTRAINT "order_table_moves_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_table_moves" ADD CONSTRAINT "order_table_moves_toTableId_fkey" FOREIGN KEY ("toTableId") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_methodConfigId_fkey" FOREIGN KEY ("methodConfigId") REFERENCES "payment_method_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_posConfigId_fkey" FOREIGN KEY ("posConfigId") REFERENCES "pos_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_counts" ADD CONSTRAINT "pos_cash_counts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_count_lines" ADD CONSTRAINT "pos_cash_count_lines_cashCountId_fkey" FOREIGN KEY ("cashCountId") REFERENCES "pos_cash_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_consumptions" ADD CONSTRAINT "production_consumptions_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quote_items" ADD CONSTRAINT "sales_quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "sales_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_countId_fkey" FOREIGN KEY ("countId") REFERENCES "stock_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

