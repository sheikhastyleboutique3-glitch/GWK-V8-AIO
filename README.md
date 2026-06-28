<div align="center">

# GWK V8 AIO

### All-In-One Restaurant ERP & Point of Sale System

**Enterprise F&B Operations** | **Odoo 19.0 POS Parity (~95%)** | **Multi-Branch** | **Bilingual (EN/AR + RTL)** | **Offline-First PWA**

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-e0234e?style=flat-square&logo=nestjs)](https://nestjs.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61dafb?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2d3748?style=flat-square&logo=prisma)](https://prisma.io)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO%204-010101?style=flat-square&logo=socket.io)](https://socket.io)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#)

---

**60+ Backend Modules** | **63 Pages** | **30 Components** | **12 User Roles** | **Real-time WebSocket**

</div>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Demo Credentials](#demo-credentials)
- [Installation Guides](#installation-guides)
- [Print Agent](#print-agent)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

---

## Features

### Front of House (POS)
| Feature | Description |
|---------|-------------|
| **Point of Sale** | Touch-optimized cashier terminal with floor plan, barcode scanning, combos, modifiers |
| **Waiter App** | Visual floor plan, table claiming (race-proof), KOT printing, split/merge bills |
| **Kitchen Display (KDS)** | Real-time order board with station filtering, sound alerts, prep time targets |
| **Self-Ordering** | Customer QR scanning → browse menu → place order (no app install) |
| **Customer Display** | Second screen showing items + running total in real-time |
| **Kiosk Mode** | Full self-service ordering with payment integration |

### Back of House
| Feature | Description |
|---------|-------------|
| **Inventory (FEFO)** | Batch-tracked stock with First-Expired-First-Out engine, serializable transactions |
| **Recipes & BOM** | Bill of Materials with yield, prep/cooking/waste loss %, multi-version |
| **Production** | Central kitchen orders — explode recipe, consume ingredients, yield finished product |
| **Procurement** | Requisitions → PO → receive → 3-way match. Auto-reorder suggestions |
| **Branch Transfers** | Inter-branch stock movements with dispatch/receive workflow |
| **Wastage** | Log waste by reason (expired/damaged/spillage) — auto-deducts stock + posts finance entry |

### Finance & Analytics
| Feature | Description |
|---------|-------------|
| **POS Sessions** | Opening/closing cash count (denomination grid), X/Z reports |
| **Finance Journal** | Revenue, COGS, Tax, Tips, Service, Commission — immutable ledger |
| **ABC Analysis** | Pareto product classification (A=80% revenue, B=15%, C=5%) |
| **Peak Hour Heatmap** | 7×24 matrix for staffing decisions |
| **Customer CLV** | RFM scoring with segment classification (Champions→Lost) |
| **Waste vs Sales** | Per-product waste ratio with severity alerts |
| **Scheduled Reports** | Daily EOD email (23:55) + Weekly (Monday) + Monthly (1st) |

### Operations
| Feature | Description |
|---------|-------------|
| **Multi-Branch** | Branch isolation guard, per-user branch assignment, all-branches view for admins |
| **12 Roles** | SUPER_ADMIN, BRANCH_MANAGER, CASHIER, WAITER, KITCHEN, PASTRY, BARISTA, PROCUREMENT, WAREHOUSE, DRIVER, CLEANER, ACCOUNTANT |
| **Staff Scheduling** | Shift creation, clock in/out, attendance reports |
| **Notifications** | In-app inbox + WhatsApp (Meta API) + Email (SMTP) |
| **Audit Trail** | Every action logged with before/after values |
| **Menu Scheduling** | Time-based availability (breakfast/lunch/dinner menus) |
| **Auto-86** | Low-stock ingredients auto-disable linked menu items |

### Platform
| Feature | Description |
|---------|-------------|
| **Offline-First** | IndexedDB queue + Background Sync + auto-replay on reconnect |
| **Real-time** | WebSocket for products, tables, orders, sessions (<100ms) |
| **Code Splitting** | React.lazy() — 65 separate chunks, ~200KB initial load |
| **Dark Mode** | System + manual toggle, forced on KDS for kitchen visibility |
| **RTL** | Full Arabic support with right-to-left layout |
| **PWA** | Installable on mobile/tablet as native-like app |
| **Multi-Currency** | 9 pre-loaded currencies with exchange rate management |
| **QR Code Generator** | Menu QR, table QR, kiosk QR — in-app generation + print |
| **Thermal Printing** | ESC/POS over TCP/IP via on-prem agent (supports station routing) |
| **PDF Export** | Receipts, invoices (Qatar VAT), Z-reports, daily summaries |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 18 + Vite)              │
│  63 Pages · 30 Components · TanStack Query · Socket.IO Client  │
│  Tailwind CSS · i18next (EN/AR) · React-PDF · Recharts         │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API + WebSocket (/realtime)
┌─────────────────────▼───────────────────────────────────────────┐
│                    BACKEND (NestJS 10 + Prisma 5)               │
│  60 Modules · JWT Auth · Rate Limiting · Event-Driven           │
│  Cron Jobs · Swagger Docs · Helmet · Compression · CORS        │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Prisma ORM (Serializable Transactions)
┌─────────────────────▼───────────────────────────────────────────┐
│                    PostgreSQL 16                                 │
│  60+ Tables · FEFO Indexes · Row Locking · Audit Trail          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              ON-PREM PRINT AGENT (Node.js)                      │
│  Polls backend → Routes KOT to station printers (ESC/POS TCP)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO

# 2. Backend setup
cd backend
cp .env.example .env          # Edit DATABASE_URL + JWT secrets
npm install
npx prisma migrate deploy     # Create all tables + indexes
npx prisma db seed            # Load demo data
npm run build
npm run start:prod            # Starts on port 3000

# 3. Frontend setup (separate terminal)
cd ../frontend
npm install
npm run build                 # Production build → dist/

# 4. Open browser
# http://localhost:3000        (serves frontend + API)
```

---

## Demo Credentials

After seeding (`npx prisma db seed`), use these accounts:

| Role | Email | Password | PIN |
|------|-------|----------|-----|
| **Super Admin** | admin@gwk.com | Admin@1234 | 1111 |
| **Branch Manager** | manager@gwk.com | Admin@1234 | 2222 |
| **Cashier** | cashier@gwk.com | Admin@1234 | 3333 |
| **Waiter** | waiter@gwk.com | Admin@1234 | 4444 |
| **Kitchen** | kitchen@gwk.com | Admin@1234 | 5555 |
| **Barista** | barista@gwk.com | Admin@1234 | 6666 |
| **Procurement** | procurement@gwk.com | Admin@1234 | 7777 |
| **Warehouse** | warehouse@gwk.com | Admin@1234 | 8888 |
| **Driver** | driver@gwk.com | Admin@1234 | 9999 |
| **Accountant** | accountant@gwk.com | Admin@1234 | 0000 |

> **PIN Login**: Use the numeric PIN at the POS terminal for fast cashier switching (no email/password needed).

### Demo Data Included
- 3 branches (Warehouse + Doha + Al Wakra)
- 20+ menu products with images, categories, and recipes
- 4 suppliers with price history
- Sample orders, requisitions, and inventory
- Floor plans with tables
- Delivery platforms (Talabat, Snoonu)
- Loyalty programs and gift cards
- 9 currencies (QAR, USD, EUR, GBP, SAR, AED, KWD, BHD, OMR)

---

## Installation Guides

| Platform | Guide |
|----------|-------|
| **Docker Compose** (recommended) | [INSTALL.md](INSTALL.md) |
| **Hostinger VPS (Ubuntu)** | [INSTALL-HOSTINGER-VPS.md](INSTALL-HOSTINGER-VPS.md) |
| **Windows (local dev)** | [INSTALL-WINDOWS.md](INSTALL-WINDOWS.md) |
| **macOS (local dev)** | See [Quick Start](#quick-start) — same steps |
| **Linux (local dev)** | See [Quick Start](#quick-start) |

### Docker Compose (One Command)

```bash
cp .env.example .env    # Edit secrets
docker compose up -d    # Starts PostgreSQL + Backend + Frontend
```

---

## Print Agent

The **on-prem print agent** runs at the restaurant on a device connected to the same network as your thermal printers (Raspberry Pi, mini-PC, or the cashier's workstation).

```bash
cd agent

# Auto-login mode (recommended):
API_URL=http://your-server:3000 \
API_EMAIL=admin@gwk.com \
API_PASSWORD=Admin@1234 \
BRANCH_ID=2 \
node print-agent.mjs
```

Features:
- Zero dependencies (uses Node.js built-ins only)
- Auto-discovers printer IPs from the app's Printers configuration
- Routes KOT tickets to the correct station printer (Hot Kitchen / Pastry / Bar)
- Prints customer receipts on order completion
- Reconnects automatically if the server goes down

See [agent/README.md](agent/README.md) for systemd service setup, Windows deployment, and troubleshooting.

---

## API Documentation

Swagger UI is available in development mode:

```
http://localhost:3000/api/docs
```

Key endpoints:
| Module | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/login`, `/pin-login`, `/refresh` |
| Products | `GET/POST/PATCH /api/products` |
| Sales | `POST /api/sales/orders`, `/items`, `/complete`, `/refund` |
| Inventory | `GET /api/inventory/grouped`, `POST /api/inventory/adjust` |
| KDS | `GET /api/kds/board`, `PATCH /api/kds/items/:id` |
| Analytics | `GET /api/analytics/sales-summary`, `/abc-analysis`, `/peak-hours`, `/customer-clv` |
| Health | `GET /api/health` (public, no auth) |
| WebSocket | `ws://host/realtime` (namespace, joins branch room) |

---

## Environment Variables

### Required (Production)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string |
| `JWT_SECRET` | `openssl rand -hex 32` | **Required in production** — app crashes without it |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` | **Required in production** — separate from JWT_SECRET |
| `NODE_ENV` | `production` | Enables security hardening |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` | CORS origin (comma-separated) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `EOD_EMAIL_ENABLED` | `true` | Enable daily sales email |
| `EOD_EMAIL_RECIPIENTS` | — | Comma-separated emails for EOD report |
| `WEEKLY_REPORT_RECIPIENTS` | — | Recipients for weekly summary |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | — | Email delivery |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 10, TypeScript 5, Prisma 5 |
| **Database** | PostgreSQL 16 (FEFO, row-locking, sequences) |
| **Frontend** | React 18, Vite 5, TanStack Query 5, Tailwind 3 |
| **Real-time** | Socket.IO 4 (WebSocket + polling fallback) |
| **Auth** | JWT (access + refresh) + PIN login + bcrypt |
| **Scheduling** | @nestjs/schedule (cron) |
| **Events** | @nestjs/event-emitter (decoupled side effects) |
| **PDF** | @react-pdf/renderer (client-side generation) |
| **Printing** | ESC/POS over TCP/IP (zero-dependency agent) |
| **Security** | Helmet, CORS, rate limiting, DTO validation |
| **i18n** | i18next (English + Arabic + RTL) |

---

## Project Structure

```
GWK-V8-AIO/
├── backend/                    # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma       # 60+ models, all enums
│   │   ├── migrations/         # PostgreSQL migrations
│   │   └── seed.ts             # Full demo seed
│   └── src/
│       ├── main.ts             # Bootstrap (helmet, CORS, swagger)
│       ├── app.module.ts       # 60 registered modules
│       ├── common/             # Guards, filters, interceptors, events
│       └── modules/            # 60 feature modules
│           ├── auth/           # Login, PIN, refresh, branch switch
│           ├── sales/          # Orders, payments, refunds, split/merge
│           ├── products/       # CRUD + 86 toggle + scheduling
│           ├── inventory/      # FEFO engine, batch tracking
│           ├── kds/            # Kitchen display gateway
│           ├── analytics/      # ABC, CLV, peak hours, waste ratio
│           ├── realtime/       # WebSocket gateway (4 event types)
│           ├── currency/       # Multi-currency exchange rates
│           ├── shifts/         # Staff scheduling + clock in/out
│           └── ...             # 50+ more modules
├── frontend/                   # React SPA
│   └── src/
│       ├── pages/              # 63 lazy-loaded page components
│       ├── components/         # 30 shared components
│       ├── lib/                # 35 utility hooks & services
│       └── i18n/               # EN + AR translations
├── agent/                      # On-prem thermal print agent
│   ├── print-agent.mjs        # Zero-dependency ESC/POS printer
│   └── README.md               # Agent setup guide
├── docker-compose.yml          # One-command deployment
├── INSTALL.md                  # Full installation guide
├── INSTALL-WINDOWS.md          # Windows-specific guide
└── INSTALL-HOSTINGER-VPS.md    # VPS deployment guide
```

---

## Public Routes (No Auth)

| Route | Purpose |
|-------|---------|
| `/login` | Staff login page |
| `/order/:branchId` | Public digital menu + self-ordering |
| `/kiosk/:configId` | Self-service kiosk |
| `/display/:branchId` | Customer-facing second screen |
| `/api/health` | Health check endpoint |

---

## Keyboard Shortcuts

| Key | Action (POS Page) |
|-----|-------------------|
| `Ctrl+K` / `Cmd+K` | Global search (works everywhere) |
| `F2` | Open payment panel |
| `F3` | Hold order |
| `F4` | Print last receipt |
| `F5` | Send to kitchen |
| `F8` | Clear cart / new order |
| `F9` | Open orders list |
| `Esc` | Close modal / cancel |
| `+` / `-` | Adjust selected item quantity |

---

## Support & Deployment

For production deployment assistance, contact the development team. The system supports:

- **Single-server** deployment (Docker Compose)
- **Multi-server** deployment (separate API + DB + CDN)
- **Load-balanced** deployment (requires Redis for session/idempotency sharing)
- **Kubernetes** deployment (health endpoint at `/api/health` for probes)

---

<div align="center">

**Built for Qatar F&B businesses** | **Odoo 19 POS parity** | **Production-hardened**

</div>
