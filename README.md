<div align="center">

# 🍽️ GWK V8 AIO

### All-In-One Restaurant ERP & Point of Sale System

**Enterprise F&B Operations** | **Odoo 19.0 POS Parity (99%)** | **Multi-Branch** | **Bilingual (EN/AR + RTL)** | **Offline-First PWA**

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-e0234e?style=flat-square&logo=nestjs)](https://nestjs.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61dafb?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2d3748?style=flat-square&logo=prisma)](https://prisma.io)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO%204-010101?style=flat-square&logo=socket.io)](https://socket.io)
[![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ed?style=flat-square&logo=docker)](https://docker.com)
[![Score](https://img.shields.io/badge/Quality-99%2F100-brightgreen?style=flat-square)](#)

---

**60 Backend Modules** | **70 Pages** | **45 Components** | **12 User Roles** | **Real-time WebSocket** | **Offline POS**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Demo](#-demo)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [User Roles](#-user-roles)
- [Module Map](#-module-map)
- [Database Schema](#-database-schema)
- [Cost Model (Recipe/BOM)](#-cost-model--how-cost-recipebom--selling-item-cost-relate)
- [System Reset](#-system-reset-admin--data--reset)
- [API Reference](#-api-reference)
- [Performance](#-performance)
- [Security](#-security)
- [Offline Mode](#-offline-mode)
- [Contributing](#-contributing)

---

## 🌟 Overview

GWK V8 AIO is a **production-grade, industrial-strength** All-in-One Restaurant ERP + POS system targeting **Odoo 19.0 POS (Bar/Restaurant) parity**. Built from the ground up for Qatar's F&B market with full Arabic/RTL support, offline-first architecture, and multi-branch data isolation.

### Key Highlights

- 🏪 **Multi-Branch** — 5+ locations with branch-level data isolation
- 📱 **Cross-Device** — Works on desktop, tablet, phone (iOS + Android)
- 🌐 **Offline-First** — POS works without internet, auto-syncs when back online
- 🇶🇦 **Qatar-Ready** — QAR currency, Arabic RTL, ZATCA QR codes for Saudi expansion
- ⚡ **Real-Time** — WebSocket-driven KDS, floor plan, and order sync (<100ms latency)
- 🔒 **Enterprise Security** — JWT + refresh rotation, rate limiting, branch isolation guard
- 🎨 **Per-Branch Branding** — Each location gets its own colors, banner, and review link

---

## 🎮 Demo

### Demo Brands

| Brand | Arabic | Locations |
|-------|--------|-----------|
| **Gaimer w Kahi** | قيمر وكاهي | West Walk Lusail (MAIN), Doha Port, Lusail Marina (EXPRESS) |
| **Shai bu Hamad** | شاي بو حمد | Gulf Mall Al Gharafa (MAIN), West Walk Lusail |
| + Central Warehouse | المستودع المركزي | Operations hub |

### Demo Access

| Role | Email | PIN | Access |
|------|-------|-----|--------|
| Super Admin | admin@gwk.qa | 1234 | Full system |
| Branch Manager | manager@gwk.qa | 2345 | Branch operations |
| Cashier | cashier@gwk.qa | 3456 | POS terminal |
| Waiter | waiter@gwk.qa | 4567 | Floor plan + ordering |
| Kitchen | kitchen@gwk.qa | 5678 | KDS (Kitchen Display) |

### URLs

| Page | URL | Auth |
|------|-----|------|
| Dashboard | `/` | Required |
| POS Terminal | `/pos` | Cashier+ |
| Waiter Floor | `/waiter` | Waiter+ |
| Kitchen Display | `/kds` | Kitchen+ |
| Digital Menu (public) | `/menu/:branchId` | None |
| Customer Kiosk | `/kiosk/:configId` | None |
| Health Check | `/api/health` | None |
| Deep Health | `/api/health/deep` | None |
| API Docs (dev) | `/api/docs` | None |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NGINX (port 80/443)                        │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ /api/* proxy  │  │ /uploads/*   │  │ /socket.io/* WebSocket   │ │
│  └───────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘ │
│          │                  │                       │               │
│  ┌───────┴──────────────────┴───────────────────────┴─────────────┐ │
│  │                    BACKEND (NestJS 10, port 3000)                │ │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────────────┐   │ │
│  │  │  Auth   │ │  Sales   │ │Inventory│ │  60 more modules  │   │ │
│  │  └────┬────┘ └────┬─────┘ └────┬────┘ └───────────────────┘   │ │
│  │       │            │            │                               │ │
│  │  ┌────┴────────────┴────────────┴──────────────────────────┐   │ │
│  │  │              Prisma 5 ORM (Connection Pool: 10)           │   │ │
│  │  └──────────────────────────┬───────────────────────────────┘   │ │
│  └─────────────────────────────┼───────────────────────────────────┘ │
│                                │                                     │
│  ┌─────────────────────────────┴───────────────────────────────────┐ │
│  │                   PostgreSQL 16 (97 tables)                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              FRONTEND (React 18 + Vite, served by nginx)         │ │
│  │  70 lazy-loaded pages | 45 components | TanStack Query           │ │
│  │  Offline: IndexedDB queue + Background Sync + localStorage cache │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│  ON-PREM PRINT AGENT    │   (runs at restaurant, not on VPS)
│  agent/print-agent.mjs  │   connects via WebSocket
│  ESC/POS thermal print  │   receipt + KOT routing
└─────────────────────────┘
```

### Event-Driven Architecture

```
Order Created → EventEmitter2 → ORDER_CHANGED → RealtimeGateway → WebSocket → All clients
Order Completed → ORDER_COMPLETED → Analytics listener + Finance journal + Loyalty accrual
Product Changed → PRODUCT_CHANGED → Branch-scoped WebSocket → POS/Menu/KDS update instantly
KDS Item Fired → KDS_CHANGED → KdsGateway → Kitchen Display auto-refresh
```

---

## ✨ Features

### Point of Sale (POS)
- Odoo-style 3-zone layout (products | cart + numpad | payment)
- Floor plan with drag-drop table management
- Barcode scanner support
- Multi-tender payments (cash, card, QR, gift card, loyalty, terminal)
- Tip buttons (10%/15%/20%)
- Split bill (by item, by seat, by quantity)
- Table merge & transfer
- Course firing (multi-course dining)
- Kitchen recall (cancel fired item)
- Combo meal ordering
- Product modifiers (size, sugar, extras)
- Product variants (with attributes)
- Weighed products (scale integration)
- Ship-later (delayed fulfillment)
- Forced session closing (cash count required)
- Keyboard shortcuts (F2=Pay, F3=Hold, F4=Print, F8=Clear)

### Kitchen Display System (KDS)
- Real-time WebSocket updates (<100ms)
- Station filtering (Hot Kitchen / Pastry / Bar)
- Status progression (QUEUED → PREPARING → READY → SERVED)
- Sound alerts on new orders
- Dark mode enforced (kitchen visibility)
- Auto-refresh with configurable interval

### Inventory (FEFO)
- First Expired, First Out (FEFO) batch tracking
- Serializable transactions with row locking
- Per-product `allowNegativeStock` override
- Batch/lot tracking with expiry dates
- Auto-86 (menu item disabled when out of stock)
- Opening stock CSV import
- Physical stock count reconciliation
- Inter-branch transfers with FEFO preview

### Digital Menu (Customer-Facing)
- Public QR code menu (`/menu/:branchId`)
- Per-branch branding (banner, color, review link)
- 3D parallax hero banner
- Category filtering with animated tabs
- Self-ordering with cart + checkout
- "Leave a Review" button (per-branch Google link)
- Real-time 86'd item removal via WebSocket
- Mobile-first responsive design

### Finance & Reporting
- Immutable finance journal (double-entry)
- Sales dashboard with period filtering
- ABC Analysis (revenue contribution)
- Peak hours heatmap
- Customer lifetime value (CLV)
- Waste ratio analysis
- Cost variance tracking
- Z-Report / X-Report generation
- End-of-day email (auto-scheduled 23:55)
- 17 CSV export types

### Multi-Branch Operations
- Branch isolation guard (data segregation)
- Central warehouse management
- Inter-branch stock transfers
- Per-branch digital menu customization
- Branch-scoped WebSocket events
- Branch switching (online + offline)

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | NestJS | 10.x |
| **ORM** | Prisma | 5.x |
| **Database** | PostgreSQL | 16 |
| **Frontend** | React | 18.2 |
| **Build** | Vite | 5.x |
| **State** | TanStack React Query | 5.x |
| **Styling** | Tailwind CSS | 3.4 |
| **i18n** | react-i18next | 14.x |
| **Charts** | Recharts | 2.x |
| **PDF** | @react-pdf/renderer | 3.x |
| **Realtime** | Socket.IO | 4.8 |
| **Auth** | Passport + JWT | - |
| **Validation** | class-validator | 0.14 |
| **Image Processing** | Sharp | 0.33 |
| **Containerization** | Docker Compose | - |
| **Web Server** | nginx:alpine | - |

---

## 📦 Installation

### Prerequisites

- Docker & Docker Compose
- Git
- 2+ GB RAM (recommended: 8GB for production)

### Quick Start (Docker)

```bash
# Clone
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO

# Configure environment
cp .env.example .env
# Edit .env with your secrets (JWT_SECRET, POSTGRES_PASSWORD, etc.)

# Launch
docker compose up -d --build

# Access
open http://localhost
```

### Development Setup

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Production Deployment (VPS)

```bash
# On your VPS (Ubuntu 22+)
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO

# Set production secrets
export JWT_SECRET="your-32-char-secret-here"
export JWT_REFRESH_SECRET="another-32-char-secret"
export POSTGRES_PASSWORD="strong-password"

# Deploy
docker compose up -d --build

# Update (zero-downtime)
git fetch origin && git reset --hard origin/main && docker compose up -d --build
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (compose auto) | PostgreSQL connection string |
| `JWT_SECRET` | ⚠️ required | JWT signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | ⚠️ required | Refresh token secret |
| `JWT_EXPIRES_IN` | `8h` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `PORT` | `3000` | Backend port |
| `NODE_ENV` | `production` | Environment |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |

### Settings (Admin Panel)

Configured via **Settings** page in the admin panel:

- Company info (name, logo, address, phone, tax ID)
- POS behavior (require session, allow negative stock)
- Currency (default QAR, multi-currency support)
- Digital menu (per-branch banner, color, review URL)
- Notification channels (WhatsApp, email SMTP)
- Staff performance module toggle

---

## 🚀 Deployment

### Recommended VPS

**Hostinger KVM 2** (or equivalent):
- 2 vCPU
- 8 GB RAM
- 100 GB SSD
- Ubuntu 22.04+

### Docker Compose Stack

```yaml
services:
  postgres:    # PostgreSQL 16 with persistent volume
  backend:     # NestJS API (auto-migrates on start)
  frontend:    # React SPA served by nginx (proxies /api and /uploads)
```

### SSL (HTTPS)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### Automated Backups

```bash
# Add to crontab (daily at 3 AM)
0 3 * * * docker exec gwk-v8-aio-postgres-1 pg_dump -U gwk_user gwk_v8_aio | gzip > /backups/$(date +\%Y\%m\%d).sql.gz
```

---

## 👥 User Roles

| Role | Access Level | Primary Workspace |
|------|-------------|-------------------|
| `SUPER_ADMIN` | Full system | Dashboard |
| `BRANCH_MANAGER` | Branch operations | Dashboard |
| `CASHIER` | POS terminal | `/pos` |
| `WAITER` | Floor plan + ordering | `/waiter` |
| `KITCHEN` | Kitchen display | `/kds` |
| `PASTRY` | Pastry KDS station | `/kds` |
| `BARISTA` | Bar KDS station | `/kds` |
| `PROCUREMENT` | Supply chain | Requisitions |
| `WAREHOUSE` | Stock management | Inventory |
| `DRIVER` | Delivery runs | Deliveries |
| `CLEANER` | Task lists | Staff Tasks |
| `ACCOUNTANT` | Finance reports | Reports |

### Price Visibility Rules

| Role | Sale Price | Cost Price |
|------|-----------|-----------|
| Management (Admin/Manager/Cashier/Procurement/Accountant) | ✅ | ✅ |
| Waiter | ✅ | ❌ |
| Kitchen/Pastry/Barista/Cleaner/Warehouse/Driver | ❌ | ❌ |

---

## 🗂️ Module Map

### Backend (60 modules)

```
backend/src/modules/
├── admin/              # System administration + data reset
├── alerts/             # Expiry + low stock alerts (hourly cron)
├── analytics/          # Sales metrics, ABC, peak hours, CLV
├── audit/              # Immutable action log
├── auth/               # JWT + PIN login + refresh rotation
├── branches/           # Multi-location management
├── cash-roundings/     # Payment rounding rules
├── categories/         # Product categories with icons
├── combos/             # Combo meal definitions
├── currency/           # Exchange rates (9 currencies)
├── customers/          # CRM + loyalty points
├── deliveries/         # Delivery dispatch + driver assignment
├── delivery-platforms/ # Talabat/Snoonu integration
├── discount-rules/     # Order/item/category discounts
├── drivers/            # GPS tracking + schedules
├── finance/            # Immutable journal (double-entry)
├── fiscal-positions/   # Tax mapping rules
├── health/             # System diagnostics endpoint
├── inventory/          # FEFO engine + batch tracking
├── iot-devices/        # Hardware registry
├── kds/                # Kitchen Display WebSocket gateway
├── loyalty/            # Points + eWallet cards
├── modifiers/          # Product options (size, sugar, etc.)
├── notifications/      # WhatsApp + Email + In-app
├── order-presets/      # Service types (Dine-in/Takeout/Delivery)
├── payables/           # Accounts payable
├── payment-methods/    # Payment config + online intents
├── payment-terminals/  # SDK integration (SIX, Worldline)
├── pos-configs/        # POS terminal profiles
├── pos-sessions/       # Shift management + cash declarations
├── pricelists/         # Dynamic pricing rules
├── pricing/            # Bulk price updates
├── printers/           # ESC/POS printer routing
├── product-attributes/ # Variants (size/color/weight)
├── production/         # Batch manufacturing
├── products/           # Menu items + RAW materials + scheduling
├── promotions/         # Coupons + gift cards
├── purchase-orders/    # Supplier ordering
├── realtime/           # WebSocket gateway (branch-scoped)
├── receivables/        # Accounts receivable
├── recipes/            # BOM (Bill of Materials) + costing
├── replenishment/      # Auto-restock triggers
├── reports/            # CSV export (17 types)
├── requisitions/       # Internal supply requests
├── sales/              # Order lifecycle (create→complete→refund)
├── sales-quotes/       # Proforma invoices
├── self-order-configs/ # Kiosk + QR ordering setup
├── settings/           # Global + per-branch configuration
├── shifts/             # Staff clock in/out
├── staff-performance/  # AI-driven performance scoring
├── staff-tasks/        # Cleaning + maintenance checklists
├── stock-counts/       # Physical inventory reconciliation
├── suppliers/          # Vendor management
├── tables/             # Floor plan + reservations
├── transfers/          # Inter-branch stock movement
├── units/              # Measurement units (kg, L, pc)
├── uploads/            # File upload + Sharp compression
├── users/              # User CRUD + role assignment
├── user-views/         # Saved filter presets
└── wastage/            # Spoilage/expiry logging
```

---

## 🗄️ Database Schema

**97 tables** organized by domain:

| Domain | Key Tables | Relationships |
|--------|-----------|---------------|
| **Orders** | `orders`, `order_items`, `payments`, `order_courses` | 12-status state machine |
| **Products** | `products`, `categories`, `product_variants`, `modifiers` | Schedule + auto-86 |
| **Inventory** | `inventory`, `batches`, `inventory_transactions` | FEFO + row-locking |
| **Finance** | `finance_entries` | Immutable journal |
| **Users** | `users`, `user_branches`, `staff_shifts` | Multi-branch assignment |
| **CRM** | `customers`, `loyalty_cards`, `gift_cards` | Points + wallet |

### Key Design Decisions

1. **Atomic order numbers** — PostgreSQL SEQUENCE (collision-proof under concurrency)
2. **FEFO with SELECT FOR UPDATE** — serializable transactions prevent race conditions
3. **Immutable transactions** — never hard-delete; soft-void with audit trail
4. **Idempotency** — 60s in-memory cache prevents double-orders on rapid POS taps

---

## 💰 Cost Model — how Cost, Recipe/BOM & Selling-Item cost relate

This is the #1 source of confusion, so here it is precisely. There are **two
kinds of cost** and they meet through the recipe:

| Term | What it is | Where it lives |
|------|-----------|----------------|
| **Ingredient cost** | The purchase cost of a *raw* item (flour, milk…) | `product.costPrice` on the RAW item, updated by purchase orders |
| **Recipe / BOM cost** | The *computed* cost to make one unit of a menu item, from its ingredients | `recipes.cost()` — calculated live |
| **Selling-item cost** | The cost stored on the *menu* item, used for margin/food-cost % | `product.costPrice` on the MENU item |

### How the recipe/BOM cost is computed
```
unitCost = (Σ component.qty × (1 + component.waste%) × component.costPrice)
           × (1 + prepLoss% + cookLoss% + waste%)      ← recipe loss factors
           ÷ recipe.yieldQty                            ← per finished unit
```
Example — a 12-cup Karak batch:
- 3 L milk @ 4.00 + 200 g tea @ 0.05/g + sugar … = **48.00 raw**
- ×1.05 (5% total loss) = 50.40 batch → ÷ 12 cups = **4.20 / cup**

### Why "recipe cost" and "selling-item cost" used to differ
The menu item's `costPrice` is a **stored field**; the recipe cost is
**computed**. They were never linked — so a menu item could show `costPrice = 0`
while its recipe clearly costs 4.20. 

**Fixed (v8.2):** whenever you create, edit, or activate the **active** recipe,
the computed BOM unit cost is now **rolled up into the menu item's `costPrice`
automatically** (Odoo-style). So the selling item's cost always reflects its
ingredients. (Update your raw-item costs → re-save/activate the recipe to
refresh the rolled-up cost.)

### What each cost is used for
- **COGS at sale time** — for items *with* a recipe, COGS is taken from the
  **live recipe explosion** (actual ingredient costs at that moment, FEFO
  batch cost). For items *without* a recipe, COGS = the item's own `costPrice`.
- **Margin / food-cost %** on reports & menu engineering — uses the menu item's
  (now rolled-up) `costPrice` vs `salePrice`.

---

## 🧹 System Reset (Admin → Data & Reset)

Two levels, both gated behind a typed confirmation phrase, FK-safe, with
sequence realignment afterwards:

| | 🧹 Soft Reset (keep master data) | 💣 Full Wipe |
|---|---|---|
| **Phrase** | `PURGE-ALL-OPERATIONAL-DATA-TO-ZERO` | same + choose "Full" |
| **Clears** | orders, payments, POS sessions, finance, inventory + batches + transactions, transfers, requisitions, POs, production, stock counts, wastage, reservations, loyalty cards, driver GPS, **sales quotes, gift cards, staff tasks**, alerts, audit, notifications | **Everything above PLUS** products, categories, units, suppliers, customers, recipes, combos, pricelists, modifiers, discounts, loyalty programs, drivers, delivery platforms, tables/floors, **POS configs, payment terminals & methods, IoT devices, self-order configs, order presets, cash roundings, product attributes, fiscal positions, tax rates, printers**, and all non-super-admin users |
| **Always kept** | products, users, branches, categories, suppliers, settings | Super-admin accounts, branches, settings |

**Granular resets** (safer, one domain at a time) are also available:
`sales`, `inventory`, `finance`, `procurement`, `notifications` — each with its
own `RESET-<MODULE>` phrase. Every destructive action is written to the audit log.

> ⚠️ **Back up first.** Run `bash scripts/backup.sh` (or a DB dump) before any
> wipe — resets are permanent. Code redeploys never touch your data; resets do.

---

## 📡 API Reference

Base URL: `/api`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Email + password login |
| POST | `/auth/pin-login` | Fast PIN login (cashier switch) |
| POST | `/auth/refresh` | Token refresh |
| PATCH | `/auth/switch-branch` | Change active branch |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sales/orders` | Create order |
| POST | `/sales/orders/:id/items` | Add item to order |
| POST | `/sales/orders/:id/payments` | Add payment |
| POST | `/sales/orders/:id/complete` | Complete sale (deducts stock) |
| POST | `/sales/orders/:id/refund` | Full refund |
| POST | `/sales/orders/:id/partial-refund` | Partial item refund |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health (Docker/LB) |
| GET | `/health/deep` | Full subsystem verification |

Full Swagger documentation available at `/api/docs` in development mode.

---

## ⚡ Performance

| Metric | Value |
|--------|-------|
| staleTime | 5 minutes (pages load from cache) |
| gcTime | 30 minutes (data persists in memory) |
| WebSocket reconnect | 1s → 30s exponential backoff |
| Product virtualization | 60 items/page (progressive) |
| Dashboard load | <200ms (consolidated endpoint) |
| Order completion | <400ms (serializable tx) |
| Offline queue replay | Auto on reconnect (2s delay) |
| Bundle size | ~2MB gzipped (70 code-split chunks) |

---

## 🔒 Security

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT + refresh token rotation |
| Authorization | Role-based guards + branch isolation |
| Rate Limiting | 100/min global, 5/min login |
| Input Validation | class-validator DTOs on all endpoints |
| Security Headers | Helmet (HSTS, CSP, XSS protection) |
| Data Isolation | Branch guard auto-filters by user's branches |
| Audit Trail | Every sensitive action logged (immutable) |
| Password Hashing | bcrypt (cost factor 12) |
| WebSocket Auth | JWT verified on connection + rate limited (20/min/IP) |
| Crash Prevention | unhandledRejection + uncaughtException handlers |
| Request Tracing | X-Request-Id on every request |

---

## 📴 Offline Mode

The POS works **without internet** for an entire shift:

1. **On boot**: Preloads products, categories, tables, printers, modifiers, branches to localStorage
2. **On network failure**: Mutations (POST/PATCH/DELETE) auto-queue to IndexedDB
3. **On reconnect**: FIFO replay with exponential backoff (max 5 retries)
4. **Conflicts**: Tracked and surfaceable (409 responses stored for review)
5. **Stale protection**: Entries older than 24h are purged (prices may have changed)
6. **Background Sync**: Service Worker registered for OS-level sync

---

## 📄 License

Proprietary. All rights reserved.

---

<div align="center">

**Built with ❤️ for Qatar's F&B industry**

*Gaimer w Kahi (قيمر وكاهي) × Shai bu Hamad (شاي بو حمد)*

</div>
