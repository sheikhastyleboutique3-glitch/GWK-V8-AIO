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

```bash
# 1. Database
docker compose up -d db

# 2. Backend
cd backend
cp ../.env.example .env          # set DATABASE_URL + JWT secrets
npm install
npx prisma migrate deploy
npx prisma db seed               # loads the demo restaurant
npm run start:dev                # http://localhost:3000  (Swagger: /api)

# 3. Frontend
cd ../frontend && npm install && npm run dev   # http://localhost:5173
```

**Demo login:** seeded admin — email from `backend/prisma/seed.ts`, password `Admin@1234` (change on first login).
The demo ships 3 branches, a coffee/pastry menu with recipes & modifiers, a positioned floor plan (8 tables), 3 station printers, payment methods, a **combo**, a **Happy-Hour pricelist**, **loyalty + eWallet** programs, IoT devices, a QR self-order point, and Talabat/Snoonu platforms.

> 📦 **Full install guides:** [Windows](./INSTALL-WINDOWS.md) · [Hostinger VPS (Ubuntu)](./INSTALL-HOSTINGER-VPS.md)

---

## 🖨️ On-prem print agent
Network KOT printing runs on a store device — see [`agent/README.md`](./agent/README.md).

## 🔒 Audit-safe by design
Transactions are never hard-deleted: orders use a state machine, order lines soft-void, payments soft-reverse, and every stock move is an immutable `InventoryTransaction` with before/after balances.

## License
Proprietary — © GWK. All rights reserved.
