# GWK V8 AIO — Project Memory

Durable knowledge about the system: architecture, key decisions, and conventions.
Keep this current so anyone (human or AI) can ramp up fast.

> **Snapshot:** Production-ready v1.1 · overall **~97/100** (post-audit) · feature parity ~99% Odoo 19 POS + ERP · fully operational on live PostgreSQL.

## What it is
All-in-one Restaurant ERP + POS targeting **Odoo 19.0 POS (Bar/Restaurant) parity**.
Multi-branch, bilingual EN/AR. One TypeScript stack end-to-end.

## Architecture
- **Backend:** NestJS 10, modular (one module per domain) under `backend/src/modules/` (~56 modules).
- **ORM/DB:** Prisma 5 + PostgreSQL. Schema at `backend/prisma/schema.prisma` (~97 models).
- **Frontend:** React 18 + Vite + Tailwind + React Query (TanStack) + i18next (`frontend/src/`).
- **POS Architecture:** POSPage is a thin orchestrator composing 6 focused sub-components (`frontend/src/pages/pos/`): FloorPlanView, OrdersListView, PaymentScreen, CartPanel, ProductCatalog, BatchSelectionDrawer. Each wrapped in `React.memo` with progressive product virtualization (60/page).
- **Realtime:** Socket.IO gateways (`/realtime` + `/kds`). Branch-scoped rooms. JWT-authenticated. Reconnection with exponential backoff (1s → 30s max).
- **Offline Engine:** Auto-queue mutations in Axios interceptor → IndexedDB → Background Sync API. Conflict tracking + exponential backoff (max 5 retries). Stale entry purging (24h). Local stock estimation.
- **Printing:** Category → Printer routing in DB; on-prem `agent/print-agent.mjs` pushes ESC/POS. Frontend `thermalPrint.ts` renders HTML for browser `window.print()`.
- **PDF Exports:** `@react-pdf/renderer` client-side (Z-Report, Daily Sales, Receipt).
- **Email:** Nodemailer for end-of-day reports (cron 23:55 + manual trigger).
- **Theme Engine:** Two complementary layers: `theme.ts` (9 brand color ramps + dark mode + font) and `themes.ts` (4 visual presets + 3 density modes + OS sync + time-based schedule).
- **Health:** `GET /api/health` — DB connectivity, uptime, memory stats.

## Key design decisions
1. **Single clean baseline migration** — fresh DB uses `prisma db push`.
2. **Decoupled menu vs warehouse:** `ProductType` (RAW/SEMI_FINISHED/MENU) + `Recipe`/`RecipeComponent` bridge deducts ingredients via **FEFO** engine on every sale.
3. **Audit-safe, never hard-delete:** orders use state machine; lines soft-void; payments soft-reverse; stock moves are immutable `InventoryTransaction` rows.
4. **Combos explode at checkout** into chosen component order-lines.
5. **Aggregators** (Talabat/Snoonu) settle via virtual `AGGREGATOR` channel.
6. **Hardware seams, not hard deps:** payment terminals auto-approve; IoT devices are a registry; printing is an external agent.
7. **Trading-day session gate:** orders blocked unless branch has OPEN PosSession. Session cannot close if OPEN/HELD orders exist.
8. **Item merging:** `addItem` merges identical unfired items by incrementing quantity.
9. **KOT new-items-only:** `firedAt` tracking; qty changes reset it to re-fire.
10. **Modifiers preserved raw:** `@IsOptional() modifiers?: any` to bypass class-transformer.
11. **Payment correction:** Manager can change method post-completion with audit trail.
12. **Real-time data:** WebSocket primary (branch-scoped); polling fallback (60-120s). Product broadcasts scoped to branch when branchId is available.
13. **Idempotency:** `idempotencyKey` + 60s server cache prevents duplicate orders. Proper `onModuleDestroy` cleanup.
14. **Pre-flight stock validation:** INSIDE serializable transaction (no TOCTOU race). Per-product `allowNegativeStock` override.
15. **Atomic order/session numbers:** PostgreSQL SEQUENCE (not count()) — collision-proof under concurrency.
16. **Collapsible sidebar nav:** 8 section groups (Overview, POS, Menu, Inventory, Purchasing, Team, Insights, Configuration). Collapse state persisted to localStorage.
17. **DataToolbar on ALL pages:** AdvancedFilterBuilder (AND/OR) + GroupBySelect + Export + SavedViews.
18. **Backend OR-logic:** Export controller accepts `_logic=OR` → wraps filter conditions in `{ OR: [...] }`.
19. **KDS station tabs:** Kitchen staff sees only their items (Hot Kitchen / Pastry / Bar).
20. **Partial qty split:** Split 3 out of 6 cheesecakes — creates new item row with proportional discount/tax.
21. **Numpad mode-based:** Tap Qty → type digits → updates LIVE (no popups).
22. **Offline auto-queue:** API interceptor catches network errors on mutations (POST/PATCH/PUT/DELETE) and queues to IndexedDB. Auth/upload paths excluded.
23. **Ship-Later:** Delayed fulfillment flag on delivery/takeaway orders (frontend toggle + backend DTO + DB field).
24. **Batch Selection Drawer:** FEFO-sorted slide-up picker for serial/lot-tracked items (replaces prompt-based picker).
25. **Keyboard shortcuts overlay:** Press `?` to see all shortcuts. Press `Ctrl+K` for command palette.
26. **Per-branch auto-86:** Menu scheduler checks inventory grouped by [productId, branchId] not globally.
27. **Dashboard consolidation:** Single `GET /analytics/dashboard-summary` replaces 8 parallel calls.
28. **Typed DTOs everywhere:** All 56 modules use class-validator DTOs (no `@Body() dto: any` remaining).

## Conventions
- New backend module = `*.service.ts` + `*.controller.ts` + `*.module.ts` + `*.dto.ts`, registered in `app.module.ts`.
- API responses are wrapped; frontend reads `r.data.data`.
- Every new UI string gets EN **and** AR i18n keys.
- Every data-list page MUST have `DataToolbar`.
- Receipts use `money()` helper which prepends the currency from Settings.
- All prompts use `usePrompt()` hook — no `window.prompt` in production code.
- All list endpoints paginated (default `take: 50`, accept `skip` param).
- WebSocket connections use `reconnectionDelayMax: 30000` (30s exponential backoff).
- Verify before shipping: backend `npm run build`; frontend `npm run build`; `prisma validate`.

## Module inventory (backend ~56)
auth, users, branches, categories, units, products, suppliers, inventory, requisitions, purchase-orders, wastage, alerts, settings, audit, uploads, admin, pricing, reports, notifications, drivers, transfers, recipes, customers, sales, finance, production, tables, promotions, kds, analytics, replenishment, staff-tasks, pos-sessions, modifiers, deliveries, sales-quotes, stock-counts, receivables, payables, delivery-platforms, discount-rules, printers, order-presets, fiscal-positions, payment-terminals, cash-roundings, loyalty, iot-devices, self-order-configs, product-attributes, combos, payment-methods, pricelists, user-views, health, realtime, currency, shifts.

## Status & Roadmap

**Current: Production-ready v1.1 (~97/100 post-audit)**

**Done:**
- Stage 1: Build & document ✅
- Stage 2: Prove runtime ✅
- Stage 2.5: Pro Max upgrade (theme, Odoo parity, audit fixes) ✅
- Stage 3: Backup script + health endpoint ✅
- Stage 4: Full system audit + all fixes (Tier 1-3) ✅

**Pending:**
- CI/CD (GitHub Actions — blocked by protected branch rules)
- Production hardening (SSL, monitoring, load testing)
- First 3 pilot customers

## Known gaps (hardware-dependent)
- Cash machine drivers (Cashdro/Glory) — needs vendor SDK
- QR-code bank payment — needs banking API
- Self-order online payment — needs Stripe
