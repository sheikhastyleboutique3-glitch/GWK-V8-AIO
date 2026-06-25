# GWK V8 AIO — Project Memory

Durable knowledge about the system: architecture, key decisions, and conventions.
Keep this current so anyone (human or AI) can ramp up fast.

> **Snapshot:** Stage 1 (build + docs + demo) complete · overall **~88/100** · feature parity ~96% · next lever = **Stage 2 (prove the runtime on live Postgres)**. See *Status & Roadmap* below.

## What it is
All-in-one Restaurant ERP + POS targeting **Odoo 19.0 POS (Bar/Restaurant) parity**.
Multi-branch, bilingual EN/AR. One TypeScript stack end-to-end.

> 📋 **Full Odoo-19 feature audit** (section-by-section coverage, mapped to models/modules) is in **[`docs/ODOO19-PARITY.md`](./ODOO19-PARITY.md)** — read it to avoid re-deriving the analysis.

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

## Status & Roadmap (remaining stages)
Current overall: **~88 / 100** toward a deployable v1.0. Feature/software is ~96% Odoo-19 parity; the gap is unproven runtime + no tests.

**✅ Stage 1 — Build & document (DONE):** full feature set, 90-model schema, admin + POS + waiter + KDS + kiosk UIs, demo seed, session gate, README + install guides + MEMORY/SKILLS + print agent.

**▶️ Stage 2 — Prove the runtime (NEXT, biggest lever):** run on a live PostgreSQL — `migrate deploy` + `seed` + a true end-to-end cycle (open session → waiter order → fire course → KDS → cashier split-tender → close → Z-report + finance journal). Expect to surface small fixes. Moves "verified runtime" ~15 → ~90.

**Stage 3 — CI + tests:** GitHub Actions running both builds + Prisma validate + a smoke test; a handful of e2e tests on the sale/session paths.

**Stage 4 — Business-decision features:** self-order online payment (Tap/Checkout.qa/Stripe), bookings/reservations management UI, enforce the existing `requiresManagerApproval` flag (PIN approval for discounts/voids/refunds), closing-discipline (block reopening an uncounted day).

**Stage 5 — On-site hardware + pilot (sandbox-impossible):** live payment-terminal SDK (Adyen/Stripe/SIX/Worldline) at the capture seam, scale/scanner/cash-machine drivers via the IoT registry; then a single-branch pilot + security/load hardening. Lifts 95 → 100.

> Keep this section current when a stage completes; mirror the short version in README "Status & Roadmap".
