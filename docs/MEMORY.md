# GWK V8 AIO — Project Memory

Durable knowledge about the system: architecture, key decisions, and conventions.
Keep this current so anyone (human or AI) can ramp up fast.

## What it is
All-in-one Restaurant ERP + POS targeting **Odoo 19.0 POS (Bar/Restaurant) parity**.
Multi-branch, bilingual EN/AR. One TypeScript stack end-to-end.

## Architecture
- **Backend:** NestJS 10, modular (one module per domain) under `backend/src/modules/`.
- **ORM/DB:** Prisma 5 + PostgreSQL. Schema at `backend/prisma/schema.prisma` (~90 models).
- **Frontend:** React 18 + Vite + Tailwind + react-query + i18next (`frontend/src/`).
- **Realtime:** Socket.IO gateway for KDS / table state (`KDS_CHANGED` event).
- **Printing:** Category → Printer routing in DB; on-prem `agent/print-agent.mjs` pushes ESC/POS.

## Key design decisions
1. **Single clean baseline migration** (`migrations/00000000000000_init`) generated from schema — no legacy migration chain. On a fresh DB, `prisma migrate deploy` builds everything.
2. **Decoupled menu vs warehouse:** one `Product` table + `ProductType` (RAW / SEMI_FINISHED / MENU) + `isSellable`/`isPosVisible`; the POS only shows MENU. `Recipe`/`RecipeComponent` is the bridge that deducts ingredients via the **FEFO** engine on every sale.
3. **Audit-safe, never hard-delete:** orders use a state machine (legacy `OPEN`/`COMPLETED` retained as aliases of `DRAFT`/`DONE`); order lines soft-void (`isVoided`); payments soft-reverse (`isReversed`); stock moves are immutable `InventoryTransaction` rows with before/after balances.
4. **Combos aren't Products:** a combo explodes at checkout into its chosen component order-lines; the first line carries the combo price, the rest are 0, so each component still deducts its recipe.
5. **Aggregators (Talabat/Snoonu)** settle via a virtual `AGGREGATOR` channel/payment so their money never inflates the cash drawer; commission & net payout tracked per order.
6. **Hardware seams, not hard deps:** payment terminals (`/payment-terminals/:id/capture`) auto-approve without a vendor SDK but expose a clearly-marked seam; IoT devices are a registry; printing is an external agent.
7. **Trading-day session gate:** `sales.create` blocks order creation unless the branch has an **OPEN** `PosSession` (opened by a cashier/manager with the opening cash count). The session is stamped on the order at creation, not just completion, so no ticket can outlive/precede its session. Configurable via Setting `pos.requireOpenSession` (default ON; `"false"` relaxes it). Waiters never open sessions — they only ride an already-open one.

## Conventions
- New backend module = `*.service.ts` (Prisma calls) + `*.controller.ts` (REST + Roles) + `*.module.ts`, registered in `app.module.ts`. Config CRUD uses pass-through `dto: any`.
- API responses are wrapped; the frontend reads `r.data.data`.
- Every new UI string gets EN **and** AR i18n keys; watch for duplicate keys.
- Migrations must be additive & idempotent; enum `ADD VALUE` lives in its own migration (a new value can't be used in the same transaction it's added).
- Verify before shipping: backend `npm run build`; frontend `npx tsc --noEmit` + `npm run build`; `prisma validate`; seed type-check.

## Repo / branch state
- Source of truth is **`main`**. All work is merged there; feature branches are deleted/synced after merge to avoid confusion.
- Pushes use the GitHub power tool (never raw `git push`). After committing, push again to avoid the commit/push race.

## Roles (12)
SUPER_ADMIN, BRANCH_MANAGER, PROCUREMENT, WAREHOUSE, KITCHEN, BARISTA, PASTRY, CASHIER, CLEANER, WAITER, DRIVER, ACCOUNTANT.
