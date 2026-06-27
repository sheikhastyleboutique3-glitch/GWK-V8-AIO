<div align="center">

# GWK V8 AIO
### All-In-One Restaurant ERP & Point of Sale

**Odoo 19.0 POS + ERP parity (~95%)** · Multi-branch · Bilingual (EN / AR) · Touch-first PWA · Offline-capable

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

### Search, Filter & Export (Odoo Parity)
| Feature | Description |
|---------|-------------|
| **DataToolbar** | Unified toolbar on all 17 list pages: filter + group + export + saved views |
| **Advanced Filter** | Multi-condition AND/OR logic, field picker, 5 types × 6+ operators |
| **Group By** | Multi-layer collapsible accordion with subtotals per group |
| **CSV Export** | 17 entity types, filter-aligned, relational (parent/child rows) |
| **Excel Export** | Client-side .xls generation via ExportColumnsModal |
| **Saved Views** | Named presets with "Set as Default" + backend persistence |

### Theme Engine
| Feature | Description |
|---------|-------------|
| **4 Themes** | Corporate Light ☀️ / Deep Slate 🌙 / AMOLED POS 🚨 / Accessibility 👁️ |
| **3 Densities** | Compact (back-office) / Default / Spacious (touch POS) |
| **Auto-detect** | Touch devices → Spacious; OS dark/light sync |
| **Schedule** | Time-based auto-switch (light at 06:00, dark at 18:00) |
| **Persistence** | localStorage + backend user profile (cross-device) |

### Data Integrity & Safety
| Feature | Description |
|---------|-------------|
| **Idempotency** | Server-side 60s key cache prevents duplicate orders on double-click |
| **Offline POS** | IndexedDB queue + auto-sync with background sync API |
| **Stock validation** | Pre-flight check before completing sale (configurable override) |
| **Offline Banner** | Persistent red/blue/amber status bar on POS + Waiter |

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
│   │   ├── modules/          # ~42 domain modules
│   │   ├── common/           # Guards, filters, interceptors, decorators
│   │   ├── main.ts           # Bootstrap (CORS, validation, Swagger)
│   │   └── app.module.ts     # Module registry
│   └── prisma/
│       ├── schema.prisma     # ~97 models
│       ├── seed.ts           # Demo data
│       └── migrations/       # Single baseline migration
├── frontend/
│   ├── src/
│   │   ├── pages/            # 60+ pages
│   │   ├── components/       # Shared UI (DataToolbar, ThemePanel, Skeleton, etc.)
│   │   ├── lib/              # API, PDF, themes, syncManager, exportExcel, savedViews
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
3. **Dine-in:** POS → Floor Plan → tap T3 → add Cappuccino (modifiers) → add Cheesecake
4. **Numpad:** Tap Cheesecake → tap Qty → type 3 → qty updates to 3 instantly
5. **Discount:** Tap %Disc → type 10 → 10% discount applied (shown on item + receipt)
6. **Kitchen:** Click Kitchen → KOT prints "DINE IN T3" with items + modifiers
7. **KDS:** Open Kitchen Display → 🔥 Hot Kitchen tab → see items → Start → Ready
8. **Payment:** Back in POS → Payment → Cash 50 → Complete (change: 5.00)
9. **Receipt:** Auto-prints with QAR currency, tax, company phone/email
10. **Takeaway:** + New Order → select Takeaway → type customer name → add items → Kitchen → Pay
11. **KOT shows:** *** TAKEAWAY *** banner prominently
12. **Waiter:** Login as `waiter@gwk.com` → floor tabs → tap table → add items → Send to Kitchen
13. **Split:** Waiter → Split → select qty per item → Create separate bill
14. **Z-Report:** Sessions → Close (must settle all orders first!) → denomination count → PDF
15. **Theme:** Click 🎨 → pick Emerald preset → Compact density → Schedule dark at 18:00
16. **Reports:** POS Reports → Product Sales / Staff Performance / Tips
17. **Filter:** Inventory → DataToolbar → Add filter → Group By Category → Export CSV
18. **Offline:** Disconnect network → red banner → add items → reconnect → auto-syncs
19. **Table edit:** Floor Plan → ✏️ → click table → change shape to Round → Save Layout
20. **Menu:** Menu page → Edit item → check "Allow negative stock" → Save

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
