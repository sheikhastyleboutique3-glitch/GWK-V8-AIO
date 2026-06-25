# GWK V8 AIO — Project Memory

Durable knowledge about the system: architecture, key decisions, and conventions.
Keep this current so anyone (human or AI) can ramp up fast.

> **Snapshot:** Stage 2 (runtime proven) complete · overall **~95/100** · feature parity ~98% Odoo 19 POS · fully operational on live PostgreSQL with demo seed.

## What it is
All-in-one Restaurant ERP + POS targeting **Odoo 19.0 POS (Bar/Restaurant) parity**.
Multi-branch, bilingual EN/AR. One TypeScript stack end-to-end.

> Full Odoo-19 feature audit (section-by-section coverage) is in **[`docs/ODOO19-PARITY.md`](./ODOO19-PARITY.md)**.

## Architecture
- **Backend:** NestJS 10, modular (one module per domain) under `backend/src/modules/` (~40 modules).
- **ORM/DB:** Prisma 5 + PostgreSQL. Schema at `backend/prisma/schema.prisma` (~95 models).
- **Frontend:** React 18 + Vite + Tailwind + React Query (TanStack) + i18next (`frontend/src/`).
- **Realtime:** Socket.IO gateway for KDS / table state (`KDS_CHANGED` event).
- **Printing:** Category → Printer routing in DB; on-prem `agent/print-agent.mjs` pushes ESC/POS. Frontend `thermalPrint.ts` renders HTML for browser `window.print()`.
- **PDF Exports:** `@react-pdf/renderer` client-side (Z-Report, Daily Sales, Receipt).
- **Email:** Nodemailer for end-of-day reports (cron 23:55 + manual trigger).

## Key design decisions
1. **Single clean baseline migration** (`migrations/00000000000000_init`) — fresh DB uses `prisma db push` or `migrate deploy`.
2. **Decoupled menu vs warehouse:** `ProductType` (RAW / SEMI_FINISHED / MENU) + `Recipe`/`RecipeComponent` bridge deducts ingredients via **FEFO** engine on every sale.
3. **Audit-safe, never hard-delete:** orders use state machine; order lines soft-void (`isVoided`); payments soft-reverse (`isReversed`); stock moves are immutable `InventoryTransaction` rows.
4. **Combos explode at checkout** into chosen component order-lines (each deducts its recipe).
5. **Aggregators** (Talabat/Snoonu) settle via virtual `AGGREGATOR` channel so their money never inflates the cash drawer.
6. **Hardware seams, not hard deps:** payment terminals auto-approve; IoT devices are a registry; printing is an external agent.
7. **Trading-day session gate:** `sales.create` blocks order creation unless the branch has an **OPEN** PosSession. Configurable via Setting `pos.requireOpenSession`.
8. **Item merging:** `addItem` merges identical unfired items (same product + modifiers + price) by incrementing quantity. Already-fired items are never merged — ensures KOT accuracy.
9. **KOT new-items-only:** Kitchen button uses `firedAt` tracking to print only newly added/modified items. Quantity changes reset `firedAt` to trigger a re-fire.
10. **Modifiers preserved raw:** `OrderItemDto.modifiers` uses `@IsOptional() modifiers?: any` (no `@IsArray()`) to bypass `class-transformer`'s `enableImplicitConversion` which was stripping nested objects.
11. **Payment correction on closed orders:** Manager can change a payment method post-completion with full audit trail (soft-reverse original + new payment + finance journal + audit log).
12. **Real-time data:** Global `staleTime: 0` — every navigation/focus fetches fresh data. `refetchInterval` handles auto-polling.

## Conventions
- New backend module = `*.service.ts` + `*.controller.ts` + `*.module.ts`, registered in `app.module.ts`.
- API responses are wrapped; frontend reads `r.data.data`.
- Every new UI string gets EN **and** AR i18n keys in `frontend/src/i18n/locales/{en,ar}.json`.
- Migrations must be additive & idempotent.
- Verify before shipping: backend `npm run build`; frontend `npx tsc --noEmit` + `npm run build`; `prisma validate`.
- Push directly to `main` (no feature branches needed for hotfixes).

## Repo / branch state
- Source of truth is **`main`**. All work is merged there.
- Pushes use the GitHub power tool (never raw `git push`).

## Roles (12)
SUPER_ADMIN, BRANCH_MANAGER, PROCUREMENT, WAREHOUSE, KITCHEN, BARISTA, PASTRY, CASHIER, CLEANER, WAITER, DRIVER, ACCOUNTANT.

## Module inventory (backend)
auth, users, branches, categories, units, products, suppliers, inventory, requisitions, purchase-orders, wastage, alerts, settings, audit, uploads, admin, pricing, reports, notifications, drivers, transfers, recipes, customers, **sales**, finance, production, tables, promotions, **kds**, analytics, replenishment, staff-tasks, **pos-sessions**, modifiers, deliveries, sales-quotes, stock-counts, receivables, payables, delivery-platforms, discount-rules, printers, order-presets, fiscal-positions, payment-terminals, cash-roundings, loyalty, iot-devices, self-order-configs, product-attributes, combos, payment-methods, pricelists.

## Frontend pages (60+)
POS, Waiter, KDS, Kiosk, Sessions, SalesHistory, SalesDashboard, PosReports, Dashboard, Catalog, Inventory, StockCount, Requisitions, PurchaseOrders, Suppliers, Transfers, Production, Tables, Bookings, Deliveries, Customers, Recipes, Modifiers, Promotions, Loyalty, Menu, Categories, Pricing, Combos, Pricelists, ProductAttributes, OrderPresets, PaymentMethods, PaymentTerminals, CashRoundings, FiscalPositions, IotDevices, SelfOrderConfigs, Printers, DiscountRules, DeliveryPlatforms, Receivables, Payables, Users, Permissions, Branches, Units, Settings, Alerts, Notifications, AuditLog, Admin, Reports, StaffTasks, SalesOrders, WaiterPage.

## Status & Roadmap

**Current overall: ~95/100** toward production v1.0.

**Stage 1 — Build & document:** ✅ DONE
**Stage 2 — Prove runtime:** ✅ DONE (live PostgreSQL, demo seed, full sale cycle verified)
**Stage 3 — CI + tests:** Pending (GitHub Actions, smoke tests on sale/session paths)
**Stage 4 — Production hardening:** Pending (SSL, backups, monitoring, load testing)

## Known gaps (hardware-dependent, not software)
- Cash machine drivers (Cashdro/Glory) — needs vendor SDK on-site
- QR-code bank payment provider integration — needs banking API
- Self-order online payment — needs Stripe/payment gateway wiring
- Serial/lot full UI (lot-selection drawer vs. current text prompt)
- Ship-later flag (delayed fulfillment)
