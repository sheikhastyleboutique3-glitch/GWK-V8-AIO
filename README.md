<div align="center">

# GWK V8 AIO
### All-In-One Restaurant ERP & Point of Sale

**Odoo 19.0 POS parity (~98%)** · Multi-branch · Bilingual (EN / AR) · Touch-first PWA

[![Stack](https://img.shields.io/badge/backend-NestJS%2010-e0234e)](#)
[![ORM](https://img.shields.io/badge/ORM-Prisma%205-2d3748)](#)
[![DB](https://img.shields.io/badge/db-PostgreSQL-336791)](#)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-61dafb)](#)
[![Lang](https://img.shields.io/badge/language-TypeScript-3178c6)](#)

</div>

---

## Overview

**GWK V8 AIO** unifies the entire restaurant operation in one TypeScript stack:

- **Front of house** — Cashier POS with floor plan, Waiter app, Kitchen Display (KDS), Self-order kiosk/QR
- **Back of house** — Inventory with FEFO batch tracking, Recipes/BOM, Production, Procurement, Transfers
- **Finance** — POS sessions & cash control, Aggregator reconciliation, Accounts receivable/payable, Immutable finance journal
- **Reporting** — PDF exports, Product sales, Staff performance, Tips, Cash reconciliation, End-of-day email

---

## Quick Start

### Prerequisites
- Node.js 18+ (recommended: 22)
- PostgreSQL 14+
- npm

### Installation

```bash
# Clone
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO

# Backend
cd backend
cp .env.example .env   # Edit DATABASE_URL + JWT_SECRET
npm install
npx prisma db push     # Creates all tables
npx prisma db seed     # Loads demo data (20 products, 12 users, 3 orders)
npm run build

# Frontend
cd ../frontend
npm install
npm run build

# Run
cd ../backend
npm run start:prod
# → http://localhost:3000
```

### Demo Credentials

| Email | Role | Branch |
|-------|------|--------|
| `admin@gwk.com` | Super Admin | All |
| `manager.d@gwk.com` | Branch Manager | Doha (West Bay) |
| `cashier@gwk.com` | Cashier | Doha |
| `waiter@gwk.com` | Waiter | Doha |
| `kitchen@gwk.com` | Kitchen | Doha |
| `barista@gwk.com` | Barista | Doha |
| `pastry@gwk.com` | Pastry | Doha |
| `procurement@gwk.com` | Procurement | Warehouse |

**All passwords:** `Admin@1234`

---

## Feature Highlights

### Point of Sale
| Feature | Description |
|---------|-------------|
| **Floor plan** | Visual table grid with drag/resize, status colors, multi-order badges |
| **Modifier selection** | Size/milk/extras modal before adding drinks (POS + Waiter) |
| **Item merging** | Tap same item twice → qty increments (not duplicate lines) |
| **Numpad** | Tap item to select → Qty / %Disc / Price actions |
| **Split bill** | Visual item+qty picker → Pay now (Cash/Card) or Pay later |
| **Multi-order tables** | Table picker when 2+ orders exist; "+ New order" button |
| **Kitchen fire** | Only prints NEW items on KOT; qty changes re-fire |
| **Station splitting** | KOT splits into BAR/DRINKS, HOT KITCHEN, PASTRY pages |
| **Payment correction** | Manager can fix Cash→Card on closed orders (audit trail) |
| **Variants** | Product attribute-based variants (e.g., S/M/L with price extra) |
| **Combos** | Multi-choice combos that explode into component lines |

### Kitchen & Printing
| Feature | Description |
|---------|-------------|
| **KDS** | Real-time kitchen display with QUEUED → PREPARING → READY flow |
| **KOT** | Thermal print with Arabic names + modifiers + notes |
| **Station routing** | Each category routes to its printer (category.printerId) |
| **Print agent** | On-prem ESC/POS agent pushes to network printers |

### Sessions & Cash Control
| Feature | Description |
|---------|-------------|
| **Session gate** | No orders without an open session (configurable) |
| **Denomination counts** | Opening + closing cash count with line-by-line breakdown |
| **Z/X Reports** | Session summary: sales, payments by method, cash variance |
| **PDF export** | Download Z-Report, Daily Sales, or Receipt as PDF |

### Reporting (new `/pos-reports` page)
| Report | Data |
|--------|------|
| Product Sales | Qty/revenue/GP per product + category breakdown |
| Staff Performance | Orders, revenue, avg ticket, tips per user |
| Tip Report | Total tips, by-staff, by-session |
| Cash Reconciliation | All closed sessions with variances |
| End-of-Day Email | Auto 23:55 or manual trigger |

### Inventory & Supply Chain
- FEFO batch tracking (auto-deducts oldest expiry first)
- Recipe/BOM auto-deduction on every sale
- Requisitions (12-status workflow)
- Purchase orders with supplier price history
- Branch transfers with driver dispatch
- Stock counts with variance audit
- Wastage logging (6 reasons)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10 (TypeScript) |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Frontend | React 18 + Vite + Tailwind CSS |
| State | TanStack React Query (staleTime: 0 = always fresh) |
| i18n | i18next (EN + AR) |
| PDF | @react-pdf/renderer |
| Realtime | Socket.IO |
| Auth | JWT + bcrypt + role-based guards |
| Printing | ESC/POS via TCP/IP (agent) + browser window.print() |

---

## Project Structure

```
GWK-V8-AIO/
├── backend/
│   ├── src/
│   │   ├── modules/          # ~40 domain modules
│   │   ├── common/           # Guards, filters, interceptors, decorators
│   │   ├── main.ts           # Bootstrap (CORS, validation, Swagger)
│   │   └── app.module.ts     # Module registry
│   └── prisma/
│       ├── schema.prisma     # ~95 models
│       ├── seed.ts           # Demo data
│       └── migrations/       # Single baseline migration
├── frontend/
│   ├── src/
│   │   ├── pages/            # 60+ pages
│   │   ├── components/       # Shared UI components
│   │   ├── lib/              # API, PDF, thermalPrint, hooks
│   │   ├── i18n/locales/     # en.json + ar.json
│   │   └── App.tsx           # Router + role-based guards
│   └── package.json
├── agent/
│   └── print-agent.mjs       # On-prem ESC/POS print agent
└── docs/
    ├── MEMORY.md             # Architecture & decisions
    ├── SKILLS.md             # Operational playbooks
    └── ODOO19-PARITY.md      # Feature coverage audit
```

---

## Demo Workflow

1. **Login** as `admin@gwk.com` / `Admin@1234`
2. **Open session:** Sessions → Open (float: 1500)
3. **POS:** Floor Plan → tap T3 → add Cappuccino (select modifiers) → add Cheesecake
4. **Kitchen:** Click Kitchen button → KOT prints with modifiers
5. **KDS:** Open Kitchen Display → see items in QUEUED → click Start → Ready
6. **Payment:** Back in POS → Payment → Cash → Complete
7. **Z-Report:** Sessions → expand session → Print or Download PDF
8. **Waiter:** Login as `waiter@gwk.com` → tap table → add items → Send to Kitchen
9. **Reports:** POS Reports → Product Sales / Staff Performance / Tips
10. **Split:** Open order → Split → select items → Pay now (Card)

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/gwk_v8_aio
JWT_SECRET=your-256-bit-secret
PORT=3000

# Optional: End-of-day email
EOD_EMAIL_ENABLED=true
EOD_EMAIL_RECIPIENTS=manager@company.qa,owner@company.qa
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@company.qa

# Optional: CORS (production)
ALLOWED_ORIGINS=https://pos.company.qa
NODE_ENV=production
```

---

## Update (running system)

```bash
git pull
cd backend && npm run build
cd ../frontend && npm run build
# Restart backend process
```

---

## Reset Database

```bash
cd backend
npx prisma db push --force-reset
npx prisma db seed
npm run build && npm run start:prod
```

---

## API Documentation

Swagger available at `/api/docs` (dev mode only).

---

## License

Proprietary — GWK Restaurant Group.
