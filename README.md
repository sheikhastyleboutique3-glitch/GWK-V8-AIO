# GWK V8 AIO — All-In-One Restaurant ERP & POS

**GWK V8 AIO** is a multi-branch, bilingual (EN/AR) **Restaurant ERP + Point of Sale** built for parity with **Odoo 19.0 POS (Bar/Restaurant Edition)**. It unifies front-of-house (POS, waiter floor plan, KDS), back-of-house (inventory, FEFO batches, recipes/BOM, production, procurement), and finance (sessions & cash control, aggregator reconciliation, accounts payable/receivable) in a single stack.

> Built on the proven GWK V7 engine and expanded to Odoo-19 architecture: POS sessions with opening/closing cash control, visual floor mapping, decoupled warehouse-vs-menu catalog, recipe-driven stock deduction, and IP/USB KOT printer routing.

---

## Tech Stack — and why

| Layer | Choice | Why it's the right tool for an ERP/POS |
|-------|--------|----------------------------------------|
| **Backend** | **TypeScript + NestJS 10** | Modular DI architecture maps cleanly to ERP domains; one language across the stack; strong typing for money/stock correctness. |
| **ORM / DB** | **Prisma 5 + PostgreSQL** | Transactional integrity (serializable transactions for sales/stock), relational modeling for a 80+ table schema, type-safe queries. |
| **Frontend** | **React 18 + Vite + TailwindCSS** | Fast touch-first POS UI, responsive waiter/cashier layouts, instant HMR dev loop. |
| **Realtime** | **WebSockets (Socket.IO)** | Live KDS/prep-display updates and table-state sync. |
| **Printing** | **ESC/POS over IP/USB** via an on-prem print agent | Standard thermal protocol; routing config lives in the DB, byte-push stays local. |

TypeScript end-to-end is deliberately chosen: a POS needs a shared, strongly-typed money/stock model between server and client, and NestJS + Prisma give transactional safety without a polyglot stack.

---

## Odoo 19.0 POS Parity — what's inside

- **POS Sessions & Cash Control** — every order lives inside an open `PosSession` bound to a `PosConfig` (register). Opening control counts the float; closing control computes **expected vs counted** cash and posts the discrepancy to the finance journal. Denomination breakdowns via `PosCashCount` / `PosCashCountLine`.
- **Restaurant Floor & Table Mapping** — `RestaurantFloor` + positioned `RestaurantTable` (x/y/width/height/shape) with live status, seat counts, table moves (`OrderTableMove`), and split-bill lineage (`Order.parentOrderId`).
- **Decoupled Menu Management** — `ProductType` (`RAW` / `SEMI_FINISHED` / `MENU`) cleanly separates warehouse stock from the customer-facing till; `Recipe` / `RecipeComponent` is the bridge that deducts fractional ingredients via the FEFO engine on sale.
- **Prep Display (KDS) & Printers** — `OrderItem.kdsStatus` lifecycle (QUEUED → PREPARING → READY → SERVED), `PreparationDisplay` screens, and `Printer` routing (`Category.printerId`, IP/USB/IOT) for Kitchen / Barista / Pastry.
- **Payments Ledger** — configurable `PaymentMethodConfig` (cash-count flag, drawer, aggregator link), third-party `DeliveryPlatform` (Talabat/Snoonu) commission & payout reconciliation kept out of the cash drawer.
- **Taxes, Pricelists, Combos, Modifiers** — `TaxRate`/`ProductTax`, `Pricelist`/`PricelistItem`, `Combo`/`ComboLine`/`ComboChoice`, `ModifierGroup`/`ModifierOption`.
- **Management Reporting** — immutable food-cost/gross-profit snapshots per order, `StockCount` variance/shrinkage audit, append-only `FinanceEntry` journal, audit log.

> **Audit-safe by design:** transactions are never hard-deleted — orders use a state machine (`DRAFT → IN_PROGRESS → READY → PAID → DONE → INVOICED`, plus `VOIDED`/`REFUNDED`), order lines soft-void (`isVoided`), and payments soft-reverse (`isReversed`).

---

## Repository Layout

```
GWK-V8-AIO/
├── backend/            NestJS 10 + Prisma 5 API
│   ├── prisma/
│   │   ├── schema.prisma          # full Odoo-19-parity schema (80+ models)
│   │   ├── migrations/            # single clean baseline (00000000000000_init)
│   │   └── seed.ts                # demo data (branches, menu, floor, printers…)
│   └── src/modules/               # auth, products, inventory, sales, kds, pos-sessions,
│                                  # printers, delivery-platforms, discount-rules, …
├── frontend/           React 18 + Vite + Tailwind (POS, Waiter, KDS, Admin)
├── docker-compose.yml  Postgres + backend + frontend
└── INSTALL.md          Step-by-step installation & operations guide
```

See **[INSTALL.md](./INSTALL.md)** for full setup, environment variables, migration, seeding, and production deployment.

---

## Quick Start (local dev)

```bash
# 1. Postgres (Docker)
docker compose up -d db

# 2. Backend
cd backend
cp ../.env.example .env            # set DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate deploy          # applies the clean baseline
npx prisma db seed                 # loads the demo restaurant
npm run start:dev                  # http://localhost:3000  (Swagger at /api)

# 3. Frontend
cd ../frontend
npm install
npm run dev                        # http://localhost:5173
```

### Demo logins
After seeding, sign in with the seeded admin (see `backend/prisma/seed.ts` — default `Admin@1234`). The demo includes 3 branches, a menu (coffee/pastry/sweets/bites) with recipes, modifiers, a positioned floor plan with 8 tables, 3 station printers, payment methods, and Talabat/Snoonu platforms.

---

## License

Proprietary — © GWK. All rights reserved.
