# GWK V8 AIO — Enterprise Restaurant & F&B Operations System

> Full Odoo POS + Enterprise parity. Real-time WebSocket sync. Zero-delay operations.
> Built for restaurants, cafes, cloud kitchens, and multi-branch F&B chains.

---

## Quick Start (Demo in 5 Minutes)

```bash
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO
cp .env.example .env
docker compose up -d
# Wait ~30s for DB + migrations + seed
# Open http://localhost in your browser
```

**Demo credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gwk.com | Admin@1234 |
| Cashier | cashier@gwk.com | Cashier@1234 |
| Waiter | waiter@gwk.com | Waiter@1234 |
| Kitchen | kitchen@gwk.com | Kitchen@1234 |

---

## What Is This?

A complete restaurant management system covering:

| Module | What It Does |
|--------|-------------|
| **POS** | Full-screen point-of-sale with floor plan, numpad, payment |
| **Waiter** | Tablet interface for table service, fire to kitchen |
| **KDS** | Kitchen Display System with station routing, timers |
| **Inventory** | FEFO stock management, batch tracking, auto-replenishment |
| **Kitchen Printing** | Real-time ESC/POS print agent (KOT + receipts) |
| **Analytics** | Revenue, food cost, GP%, best sellers, EOD reports |
| **Staff Performance** | AI-powered scoring, improvement suggestions, leaderboard |
| **Customers & Loyalty** | Points, rewards, store credit, customer accounts |
| **Delivery** | Platform integration (Talabat, Snoonu), driver dispatch |
| **Finance** | Journal entries, receivables, payables, cash control |
| **Production** | Central kitchen, BOM/recipe management, yield tracking |
| **Self-Order** | QR table ordering, kiosk mode |

---

## Demo Walkthrough (20 Steps)

### 1. Login & Dashboard
- Open the app → login as `admin@gwk.com`
- See role-based dashboard widgets (revenue, orders, GP%)
- Press `Ctrl+K` → global search (find anything instantly)

### 2. POS Dashboard (Odoo-style)
- Navigate to **POS Dashboard** in sidebar
- See session card → click **Open Session**
- Count cash denominations (500, 200, 100, 50, 10, 5, 1 QAR)
- Click **Open Session** → redirected to full-screen POS

### 3. POS — Floor Plan
- See your restaurant floor plan with tables (round/square/rectangle)
- Green = available, Red = occupied
- Click a table → starts a new order for that table
- Edit mode (pencil icon): drag tables, resize, change shape, add new

### 4. POS — Take an Order
- Products grid on left, cart on right (both scroll internally — no page scroll!)
- Click products to add to cart
- Use numpad: tap Qty → type digits → live update
- Keyboard shortcuts: `+/-` for qty, `Delete` to remove, `F2` to search
- Select channel: Dine-in / Takeaway / Delivery

### 5. POS — Fire to Kitchen
- Click **🔥 Fire** → items sent to kitchen
- KDS screen updates instantly (< 100ms via WebSocket)
- Print agent prints KOT ticket to the correct station printer
- KOT shows: station, table, channel, items with modifiers

### 6. POS — Payment
- Click **💳 Payment** (or press `Enter`)
- Full-screen Odoo-style payment with numpad
- Split payment: Cash + Card + Gift Card
- Payment Terminal: select terminal → "Waiting for device..."
- Click **Validate** → order completed → receipt auto-prints

### 7. POS — After Payment
- Tip prompt: "Add Tip" button (tip after payment, Odoo-style)
- QR Review: if `review_url` is set, shows QR for Google Review
- Receipt prints with: logo, items, discounts, tax, payments, change
- Customer Display updates: "Thank You!" screen for 8 seconds

### 8. Waiter Tablet
- Open `/waiter` on a tablet (full-screen, no sidebar)
- See floor plan with table status colors
- Tap table → add items → fire to kitchen
- Switch waiter: tap "Switch" → enter 4-digit PIN → instant handoff
- Sound alert: ding when new orders arrive from POS

### 9. Kitchen Display (KDS)
- Open `/kds` on a kitchen screen (full-screen, no sidebar)
- 3 columns: QUEUED → PREPARING → READY
- Station tabs: All / Hot Kitchen / Pastry / Bar
- Timer badge: shows elapsed time per order (red pulse after 10min)
- Sound alert: kitchen bell on new tickets
- Tap "Start" / "Ready" / "Served" to advance items

### 10. Print Agent (Instant Printing)
- Run on a Raspberry Pi or any PC on the restaurant LAN:
  ```bash
  cd agent && npm install
  API_URL=http://your-vps-ip node print-agent.mjs
  ```
- WebSocket connection → prints KOT/receipt in < 100ms
- Station routing: Hot Kitchen printer, Pastry printer, Receipt printer
- Falls back to polling if WebSocket disconnects

### 11. Inventory & Stock
- Products tracked with FEFO (First Expiry First Out)
- Batch/lot numbers, expiry dates, shelf life
- Low stock alerts, auto-replenishment suggestions
- Stock counts (physical inventory)
- Wastage tracking with finance journal entries

### 12. Staff Performance Intelligence
- Navigate to **Staff Performance** in sidebar
- See team scorecard: top performers + needs improvement
- Individual metrics: speed, upselling, voids, tips, prep time
- AI-generated improvement suggestions per staff member
- Enable/disable in Settings → Staff Performance toggle
- Nightly cron (00:30) auto-generates reports

### 13. Customers & Loyalty
- Customer profiles with purchase history
- Loyalty points: earn on spend, redeem at POS
- Store credit / gift cards
- Customer statements (outstanding balances)
- Quick-create: type name in POS → auto-creates customer

### 14. Delivery Platforms
- Built-in Talabat / Snoonu / generic aggregator support
- Commission tracking per platform
- Platform reference number on orders
- Driver dispatch with status tracking

### 15. Reports & Analytics
- Sales dashboard with charts
- Best sellers, revenue by hour, category performance
- Z-Report (session close), X-Report (mid-session)
- CSV export for all data (17 export types)
- EOD email report (auto-sent at 23:55 nightly)

### 16. Settings & Configuration
- Company info (name, logo, phone, address, tax ID)
- Currency, language (EN/AR/FR/TR/UR/HI)
- POS configs (multiple terminals per branch)
- Printers, payment terminals, fiscal positions
- Staff Performance toggle, Review QR URL

### 17. Multi-Branch
- Multiple branches with separate inventory
- Branch switching in header
- All Branches mode for cross-branch reporting
- Transfers between branches

### 18. Security & Access
- 11 roles: Super Admin, Branch Manager, Procurement, Warehouse, Kitchen, Barista, Pastry, Cashier, Waiter, Driver, Cleaner
- PIN-based cashier switch (4-digit, no logout needed)
- Manager PIN override for voids/refunds
- JWT 8h expiry, auto-refresh
- Audit trail (who changed what, when)

### 19. Keyboard Shortcuts (POS)
| Key | Action |
|-----|--------|
| Enter | Pay / Validate |
| Escape | Back |
| Alt+P | Open Payment |
| Alt+B | Back to Floor |
| Alt+O | Orders List |
| +/- | Qty up/down |
| Delete | Remove item |
| F2 | Focus search |
| Ctrl+K | Global search (any page) |

### 20. Customer Display
- Open `/customer-display` on a second monitor facing the customer
- Shows items being added in real-time
- After payment: "Thank You!" animation
- Idle: shows business logo + welcome message

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                   │
│  POS · Waiter · KDS · Kiosk · Customer Display · Back-Office     │
├──────────────────────────────────────────────────────────────────┤
│                     WebSocket (Socket.IO /realtime)               │
├──────────────────────────────────────────────────────────────────┤
│                    BACKEND (NestJS + Prisma + PostgreSQL)         │
│  REST API · Real-time Gateway · Cron Jobs · Event Bus            │
├──────────────────────────────────────────────────────────────────┤
│                         PostgreSQL 15                             │
└──────────────────────────────────────────────────────────────────┘
         │
         │ WebSocket
         ▼
┌────────────────────┐
│ Print Agent (LAN)  │ ──TCP/9100──→ [ESC/POS Printers]
└────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query |
| Backend | NestJS 10, Prisma 5, Socket.IO, Node 18+ |
| Database | PostgreSQL 15 |
| Real-time | Socket.IO WebSocket (< 100ms sync) |
| Printing | ESC/POS over TCP/IP via on-prem agent |
| Auth | JWT (8h access + 7d refresh), PIN login |
| Deployment | Docker Compose (single command) |

---

## Installation

See detailed guides:
- **[INSTALL.md](./INSTALL.md)** — General setup (any Linux/Mac)
- **[INSTALL-HOSTINGER-VPS.md](./INSTALL-HOSTINGER-VPS.md)** — Hostinger Ubuntu VPS
- **[INSTALL-WINDOWS.md](./INSTALL-WINDOWS.md)** — Windows local development

### Quick Docker Deploy:
```bash
cp .env.example .env
# Edit .env with your settings (DB password, JWT secret, SMTP, etc.)
docker compose up -d --build
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://... | PostgreSQL connection string |
| JWT_SECRET | (required) | Access token signing secret |
| JWT_EXPIRES_IN | 8h | Token lifetime |
| ALLOWED_ORIGINS | * | CORS whitelist (comma-separated) |
| SMTP_HOST | — | Email server for reports |
| SMTP_PORT | 587 | SMTP port |
| SMTP_USER | — | SMTP username |
| SMTP_PASS | — | SMTP password |
| EOD_EMAIL_RECIPIENTS | — | Comma-separated manager emails |
| EOD_EMAIL_ENABLED | true | Enable nightly EOD report |

---

## API Documentation

When running in development mode, Swagger docs are available at:
```
http://localhost:3000/api/docs
```

---

## Print Agent Setup

See [agent/README.md](./agent/README.md) for full setup instructions.

Quick start:
```bash
cd agent
npm install
API_URL=http://your-server-ip node print-agent.mjs
```

---

## License

Proprietary — GWK Group. All rights reserved.
