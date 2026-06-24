<div align="center">

# 🍽️ GWK V8 AIO
### All-In-One Restaurant ERP & Point of Sale

**Odoo 19.0 POS (Bar/Restaurant) parity** · Multi-branch · Bilingual (EN / AR) · Touch-first

[![Stack](https://img.shields.io/badge/backend-NestJS%2010-e0234e)](#)
[![ORM](https://img.shields.io/badge/ORM-Prisma%205-2d3748)](#)
[![DB](https://img.shields.io/badge/db-PostgreSQL-336791)](#)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-61dafb)](#)
[![Lang](https://img.shields.io/badge/language-TypeScript-3178c6)](#)

</div>

---

## Overview

**GWK V8 AIO** unifies the entire restaurant operation in one TypeScript stack:

- **Front of house** — Cashier POS, Waiter floor plan, Kitchen Display (KDS), self-order kiosk/QR
- **Back of house** — Inventory with FEFO batch tracking, recipes/BOM, production, procurement, transfers
- **Finance** — POS sessions & cash control, aggregator reconciliation, accounts receivable/payable, immutable food-cost & gross-profit snapshots

It is built for parity with **Odoo 19.0 Point of Sale** while keeping the proven multi-branch back-office engine.

---

## ✨ Feature Highlights

| Domain | Capabilities |
|--------|--------------|
| **POS Checkout** | Split tender, split-by-seat, discounts & coupons, **service presets** (Dine-In / Takeout / Delivery), **pricelists**, **combos**, **product variants**, modifiers, **serial/lot capture**, tips |
| **Sessions & Cash** | Opening/closing **cash control** with denomination counts, expected-vs-counted variance posted to the finance journal, X/Z reports |
| **Restaurant** | Visual **floor & table mapping** (x/y/shape), table transfer/merge, **course firing** (Fire Course N), bookings |
| **Kitchen** | **KDS** live queues, **printer routing** per category (Kitchen / Barista / Pastry) + on-prem **ESC/POS print agent** |
| **Menu** | Decoupled warehouse vs. menu (`ProductType`), **recipe BOM** auto-deduction via FEFO on every sale |
| **Payments** | Configurable methods, **payment terminals** (Adyen/Stripe/Viva/SIX/Worldline seam), **loyalty / eWallet** redeem, gift cards, third-party **aggregators** (Talabat/Snoonu) with commission & payout reconciliation |
| **Self-Order** | Public **kiosk / QR** ordering at `/kiosk/:configId` |
| **People** | 12 roles, manager approval gate, **employee PIN/badge login** |
| **Reporting** | Food cost %, gross profit, stocktake variance/shrinkage, append-only finance ledger, audit log |
| **Config** | 10 admin screens: presets, payment methods/terminals, cash rounding, fiscal positions, pricelists, combos, attributes/variants, IoT devices, self-order, printers |

---

## 🧱 Tech Stack & Why

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend | **NestJS 10 (TypeScript)** | Modular DI maps cleanly to ERP domains; one language across the stack |
| ORM / DB | **Prisma 5 + PostgreSQL** | Serializable transactions for sales/stock correctness; 90-model relational schema |
| Frontend | **React 18 + Vite + Tailwind** | Fast touch-first POS UI, instant HMR |
| Realtime | **WebSockets (Socket.IO)** | Live KDS / table-state sync |
| Printing | **ESC/POS over IP/USB** via on-prem agent | Standard thermal protocol; routing config in DB, byte-push stays local |

---

## 📁 Repository Layout

```
GWK-V8-AIO/
├── backend/        NestJS 10 + Prisma 5 API (50+ feature modules)
│   ├── prisma/
│   │   ├── schema.prisma     # 90-model Odoo-19-parity schema
│   │   ├── migrations/       # single clean baseline (00000000000000_init)
│   │   └── seed.ts           # full demo (menu, recipes, floor, combos, loyalty…)
│   └── src/modules/
├── frontend/       React 18 + Vite + Tailwind (POS, Waiter, KDS, Kiosk, Admin)
├── agent/          On-prem ESC/POS KOT print agent (zero-dep Node)
├── docker-compose.yml
├── INSTALL-WINDOWS.md          # local dev on Windows
├── INSTALL-HOSTINGER-VPS.md    # production on Hostinger VPS (Ubuntu)
└── docs/  MEMORY.md · SKILLS.md
```

---

## 🚀 Quick Start

**Prerequisites:** Node.js 20 LTS · PostgreSQL 14+ (or Docker) · Git. Detailed OS-specific steps are in the install guides linked below.

```bash
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO

# 1. Database (or use your own Postgres and skip this)
docker compose up -d db

# 2. Backend
cd backend
cp ../.env.example .env           # set DATABASE_URL + JWT secrets (openssl rand -hex 32)
npm install
npx prisma generate
npx prisma migrate deploy         # builds all tables from the clean baseline
npx prisma db seed                # loads the demo restaurant
npm run start:dev                 # API http://localhost:3000  (Swagger: /api)

# 3. Frontend  (second terminal)
cd ../frontend && npm install && npm run dev   # UI http://localhost:5173
```

**Demo login:** `admin@gwk.com` · password **`Admin@1234`** (change on first login).

The seed ships **3 branches**, a coffee/pastry **menu with recipes & modifiers**, a positioned **floor plan (8 tables)**, **3 station printers**, payment methods, a **combo** (Coffee & Croissant), a **Happy-Hour pricelist** (−20% hot drinks), **loyalty + eWallet** programs, **IoT devices**, a **QR self-order** point, and **Talabat/Snoonu** platforms — plus 12 staff accounts (see [Demo Staff](#-demo-staff--workflows--permissions)).

### ▶️ 90-second demo walkthrough
Take a full ticket through the system the way a real shift runs:

1. **Open the day** — sign in as **`cashier@gwk.com`** → **Sessions** → *Open session* with an opening cash count (e.g. 500). *(Orders are blocked until a branch session is open — this is the trading-day gate.)*
2. **Take an order** — sign in as **`waiter@gwk.com`** → **Waiter** → pick a table → add a **Caffè Latte** (try the size **variant**), a **combo**, fire **Course 1** to the kitchen.
3. **Kitchen** — sign in as **`barista@gwk.com`** / **`kitchen@gwk.com`** → **KDS** → bump tickets PREPARING → READY → SERVED.
4. **Settle** — back as **cashier** → **POS** → load the waiter's bill → **split-tender** (cash + card-terminal) or **split-by-seat** → pay → receipt + KOT.
5. **Self-order** — open **`/kiosk/1`** (no login) → browse the menu → place a QR order; it lands for staff to confirm.
6. **Close the day** — cashier → **Sessions** → *Close* with the counted drawer → the over/short variance posts to the **finance journal**; view the **Z-report**.

> 📦 **Full install guides:** [Windows (local/dev)](./INSTALL-WINDOWS.md) · [Hostinger VPS — Ubuntu (production)](./INSTALL-HOSTINGER-VPS.md)
> 🖨️ **In-store printing:** [print agent](./agent/README.md) · 🧠 **Maintaining the project:** [docs/MEMORY.md](./docs/MEMORY.md) · [docs/SKILLS.md](./docs/SKILLS.md)

---

## 👥 Demo Staff — Workflows & Permissions

All demo accounts use password **`Admin@1234`** (change on first login). New hires land **PENDING** until a manager approves them; all demo users are pre-approved. Access is **role-based** and **branch-scoped** (users only see their assigned branch's data).

> **⏱️ Trading-day rule (session gate).** A branch's day must be **opened by a cashier/manager** via a POS session with an **opening cash count** before *any* order can be created — waiter or cashier. Every ticket is then bound to that session for accurate cash control & Z-reports (no orphan orders). Waiters don't open sessions (they handle no cash); they can punch orders only once the branch session is open. Enforced in `sales.create`; toggle with the `pos.requireOpenSession` setting (default **ON**, set `"false"` to relax). End of shift: cashier/manager runs the **closing count** → variance posts to the finance journal.

### Demo accounts

| Email | Name | Role | Branch | Lang |
|-------|------|------|--------|------|
| `admin@gwk.com` | Super Admin | **SUPER_ADMIN** | Warehouse (all) | EN |
| `manager.d@gwk.com` | Rania Al-Kuwari | **BRANCH_MANAGER** | Doha | AR |
| `manager.w@gwk.com` | Faisal Al-Thani | **BRANCH_MANAGER** | Wakra | AR |
| `procurement@gwk.com` | Omar Al-Marri | **PROCUREMENT** | Warehouse | EN |
| `warehouse@gwk.com` | Nasser Al-Dosari | **WAREHOUSE** | Warehouse | AR |
| `kitchen@gwk.com` | Layla Al-Naimi | **KITCHEN** | Doha | AR |
| `barista@gwk.com` | Tariq Al-Hajri | **BARISTA** | Doha | EN |
| `pastry@gwk.com` | Hana Al-Sulaiti | **PASTRY** | Doha | AR |
| `cashier@gwk.com` | Sami Al-Emadi | **CASHIER** | Doha | EN |
| `waiter@gwk.com` | Khalid Al-Naimi | **WAITER** | Doha | EN |
| `cleaner@gwk.com` | Yusuf Al-Kaabi | **CLEANER** | Doha | AR |
| `kitchen.w@gwk.com` | Mona Al-Mohannadi | **KITCHEN** | Wakra | AR |

> Roles also defined for **DRIVER** (deliveries terminal) and **ACCOUNTANT** (finance/reconciliation) — create them under **Team → Users**.
> Pages open to *every* signed-in user: **Dashboard, Product Catalog, Requisitions, Wastage, Alerts, Notifications**.

### Role workflows & access

#### 🛡️ SUPER_ADMIN — *Super Admin*
**Workflow:** Owns global setup. Creates branches, users, categories, menu, recipes, modifiers, taxes/pricelists/combos, printers, payment methods/terminals, presets, loyalty, IoT & self-order configs; reviews the audit log and company-wide analytics.
**Access:** Everything, all branches — including **Branches** and **Audit Log** (super-admin only).

#### 🧑‍💼 BRANCH_MANAGER — *Rania (Doha) / Faisal (Wakra)*
**Workflow:** Runs one branch end-to-end. Approves new staff, manages menu/recipes/promotions, opens/closes POS sessions & reviews cash variance, handles purchase orders/payables/receivables, monitors KDS and reports, and owns all **Configuration** screens for the branch.
**Access:** Sales dashboard & orders, POS, Waiter, Tables, KDS, Menu/Recipes/Modifiers/Promotions, Inventory/StockCount/Production/Transfers, Suppliers/POs/Payables, Staff Tasks, Users, Reports/Sessions/Receivables/Delivery-platforms, all **Configuration**, Discount Rules, Printers, Loyalty. *(Not: Branches, Audit Log.)*

#### 💳 CASHIER — *Sami*
**Workflow:** Opens a session with the **opening cash count**, rings up orders at the **POS** (presets, variants, combos, modifiers, discounts, split-tender, split-by-seat, loyalty/eWallet & terminal tenders), settles waiter bills, manages customers/deliveries, and runs the **closing cash count** + Z report at end of shift.
**Access:** POS, Waiter, Tables, Deliveries, Customers, Menu/86, Sales History, Sessions, Receivables, Loyalty + the open-to-all pages.

#### 🧑‍🍳 WAITER — *Khalid*
**Workflow:** Works the **floor plan** — seats guests at tables, punches orders per seat, fires **courses** to the kitchen in waves, marks 86 items, requests the bill; the cashier settles payment.
**Access:** Waiter, Tables, Menu/86 + open-to-all.

#### 🔥 KITCHEN — *Layla (Doha) / Mona (Wakra)*
**Workflow:** Works the **KDS** hot-kitchen queue: receives fired tickets/courses, advances them PREPARING → READY → SERVED, marks 86 items, and runs **production orders** (central-kitchen prep that consumes raw stock and yields semi/finished goods). Maintains **recipes/BOM**.
**Access:** KDS, Menu/86, Recipes & BOM, Production + open-to-all.

#### ☕ BARISTA — *Tariq*
**Workflow:** Works the **bar/drinks KDS** station — prepares and bumps drink tickets routed to the Barista printer/screen; marks drinks 86.
**Access:** KDS, Menu/86 + open-to-all.

#### 🥐 PASTRY — *Hana*
**Workflow:** Works the **pastry/bakery KDS** station, runs pastry **production**, and maintains pastry **recipes**.
**Access:** KDS, Menu/86, Recipes & BOM, Production + open-to-all.

#### 📦 PROCUREMENT — *Omar*
**Workflow:** Sources supply: manages **suppliers**, raises **purchase orders**, tracks **payables** (aging), sets **bulk pricing**, moves stock via **transfers**, reconciles **delivery platforms**, and watches inventory & reports across branches.
**Access:** Pricing, Inventory, Suppliers, Purchase Orders, Payables, Transfers, Reports, Receivables, Delivery Platforms + open-to-all.

#### 🏭 WAREHOUSE — *Nasser*
**Workflow:** Central-warehouse ops: receives goods into **batches (FEFO)**, fulfills branch **requisitions**, dispatches **transfers**, runs **stocktakes** (variance/shrinkage) and **production**, and clears assigned **staff tasks**.
**Access:** Inventory, Stock Count, Production, Transfers, Suppliers, Purchase Orders, Staff Tasks + open-to-all.

#### 🧹 CLEANER — *Yusuf*
**Workflow:** Receives and completes **staff tasks/checklists** (cleaning, opening/closing duties, maintenance) assigned by the manager.
**Access:** Staff Tasks + open-to-all.

#### 🚗 DRIVER *(role available; create as needed)*
**Workflow:** Uses the **Deliveries** terminal: picks up assigned delivery orders, moves them OUT_FOR_DELIVERY → DELIVERED.
**Access:** Deliveries + open-to-all.

#### 🧮 ACCOUNTANT *(role available; create as needed)*
**Workflow:** Reviews finance: receivables/payables and aggregator **reconciliation** (gross vs commission vs net payout).
**Access:** Finance/reconciliation endpoints + open-to-all.

---

## 🖨️ On-prem print agent
Network KOT printing runs on a store device — see [`agent/README.md`](./agent/README.md).

## 🔒 Audit-safe by design
Transactions are never hard-deleted: orders use a state machine, order lines soft-void, payments soft-reverse, and every stock move is an immutable `InventoryTransaction` with before/after balances.

## 📊 Status & Roadmap

**Overall: ~88 / 100** toward a deployable v1.0 — ~96% Odoo-19 POS feature parity; the remaining gap is proving the runtime + tests, and on-site hardware.

| Stage | State |
|-------|-------|
| **1. Build & document** | ✅ Done — full features, 90-model schema, all UIs, demo seed, session gate, docs |
| **2. Prove the runtime** | ▶️ Next — live Postgres `migrate + seed` + a true end-to-end open→order→KDS→pay→close cycle |
| **3. CI + tests** | ⏳ GitHub Actions (builds + validate + smoke) and e2e on sale/session paths |
| **4. Business features** | ⏳ Self-order online payment, bookings UI, manager-approval enforcement, closing discipline |
| **5. Hardware + pilot** | ⏳ On-site terminal/scale/cash-machine SDKs, single-branch pilot, security/load hardening |

> Detailed roadmap & rationale live in [docs/MEMORY.md](./docs/MEMORY.md#status--roadmap-remaining-stages).

## License
Proprietary — © GWK. All rights reserved.
