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

---

> **Demo Brands:** This system powers **Gaimer w Kahi** (قيمر وكاهي) — Traditional Qatari Breakfast & Café — and **Shai bu Hamad** (شاي بو حمد) — Qatari Tea House — across 5 locations in Qatar: West Walk (Lusail), Doha Port, Lusail Marina, and Gulf Mall.

</div>

---

## Table of Contents

- [Operational Workflows](#operational-workflows)
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

## Operational Workflows

### How the System Flows — End to End

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ CUSTOMER │────▶│  WAITER  │────▶│ KITCHEN  │────▶│ CASHIER  │────▶│ MANAGER  │
│          │     │          │     │          │     │          │     │          │
│ Scans QR │     │ Takes    │     │ Prepares │     │ Collects │     │ Reviews  │
│ or Sits  │     │ Order    │     │ Food     │     │ Payment  │     │ Reports  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

---

### 1. Customer Journey

```
Customer arrives → Scans table QR / Waiter greets
         │
         ├─── Self-Order (QR): Browse menu → Add to cart → Place order → Kitchen receives
         │
         ├─── Dine-In (Waiter): Waiter takes order on tablet → Fires to kitchen
         │
         ├─── Takeaway: Cashier enters order → Kitchen prepares → Customer picks up
         │
         └─── Delivery (Talabat/Snoonu): Platform sends order → Kitchen prepares → Driver delivers
```

**What the customer sees:**
- **QR Menu** (`/order/:branchId`): Full menu with images, categories, prices. Add to cart, checkout with table number.
- **Customer Display** (`/display/:branchId`): Second screen at counter showing items being scanned + running total.
- **Kiosk** (`/kiosk/:configId`): Self-service terminal for ordering + payment.

---

### 2. Waiter Workflow

```
Open App → See Floor Plan (tables colored by status)
    │
    ├── Tap GREEN table → Create new order (atomic claim, no duplicates)
    ├── Tap AMBER table → Resume existing order (add more items)
    ├── Tap RED table → Bill requested (notify cashier)
    │
    ▼
Select items from menu → Add modifiers (size, sugar, extras)
    │
    ▼
Send to Kitchen (🔥 Fire) → KOT prints at correct station
    │                         (Hot Kitchen / Bar / Pastry)
    ▼
Guest asks for bill → Request Bill → Table turns RED
    │
    ▼
Cashier settles payment → Table auto-resets to GREEN (available)
```

**Waiter capabilities:**
- See live floor plan (real-time via WebSocket — no refresh needed)
- Claim tables atomically (no race conditions with other waiters)
- Split bill (by item or by seat)
- Transfer table (move order to different table)
- Merge orders (combine two tables into one bill)
- Send to kitchen with course timing (Course 1 first, Course 2 later)

---

### 3. Kitchen (KDS) Workflow

```
Order Fired by Waiter/POS
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  KITCHEN DISPLAY SYSTEM (auto dark mode, sound alerts)  │
├──────────────┬──────────────────┬───────────────────────┤
│   QUEUED     │    PREPARING     │        READY          │
│  (new items) │  (being cooked)  │   (waiting pickup)    │
├──────────────┼──────────────────┼───────────────────────┤
│ Order #4521  │  Order #4519     │   Order #4517         │
│ 2x Latte    │  1x Grilled Fish │   3x Caesar Salad     │
│ ⏱ 0:45      │  ⏱ 8:23          │   ⏱ Done              │
│ [Start ▶]   │  [Ready ✓]       │   [Served ✓]          │
└──────────────┴──────────────────┴───────────────────────┘
```

**Kitchen capabilities:**
- See orders grouped by station (Hot Kitchen / Pastry / Bar)
- Sound alert (🔔 beep) when new orders arrive
- Prep time timer with color-coded urgency (green → amber → red OVERDUE)
- Advance items through workflow: Queued → Preparing → Ready → Served
- Items are routed to the correct printer/station by category

---

### 4. Cashier (POS) Workflow

```
Open Session (count cash in drawer by denomination)
    │
    ▼
┌── Take Orders ──────────────────────────────┐
│  • Scan barcode / tap product / search      │
│  • Apply modifiers, combos, discounts       │
│  • Choose channel (Dine-in/Takeaway/etc.)   │
│  • Apply coupon or loyalty card             │
└─────────────────────────────────────────────┘
    │
    ▼
┌── Settle Payment ───────────────────────────┐
│  • Split tender (part cash, part card)      │
│  • Multi-currency (USD/EUR → QAR)           │
│  • Loyalty points redemption                │
│  • Gift card / store credit                 │
│  • Payment terminal integration             │
└─────────────────────────────────────────────┘
    │
    ▼
Complete Order → Receipt prints → Stock deducted (FEFO) → Finance journal posted
    │
    ▼
End of shift → Close Session → Count drawer → Z-Report prints
                                (variance = counted - expected)
```

**Cashier capabilities:**
- Keyboard shortcuts (F2=Pay, F3=Hold, F4=Print, F8=Clear)
- Barcode scanning (auto-add product to cart)
- Hold/resume orders (park a bill, come back later)
- Refund (full or partial — item-level selection)
- Payment correction (manager PIN override)
- Cash in/out movements (tracked, reason required)
- X-Report (mid-shift check) / Z-Report (end of day)

---

### 5. Driver Workflow

```
Order marked DELIVERY
    │
    ▼
Manager assigns driver (or driver self-assigns)
    │
    ▼
Driver sees "My Runs" → Status: ASSIGNED
    │
    ├── Taps "Out for Delivery" → Status: OUT_FOR_DELIVERY
    │   (GPS tracking starts, customer can see ETA)
    │
    └── Taps "Delivered" → Status: DELIVERED
        (order complete, driver freed for next run)
```

---

### 6. Procurement / Warehouse Workflow

```
┌─ Branch Manager notices low stock ──────────────────────┐
│                                                          │
│  System auto-generates LOW STOCK alert                   │
│  OR Manager creates Requisition manually                 │
└──────────────────────────────────────────────────────────┘
         │
         ▼
Requisition: DRAFT → SUBMITTED → MANAGER_APPROVED
         │
         ▼
Procurement creates Purchase Order → Sends to Supplier
         │
         ▼
Supplier delivers goods → Warehouse receives
         │                   (matches PO quantities,
         │                    records batch/expiry,
         │                    price change → history)
         ▼
Stock added to inventory (FEFO) → Requisition: CONFIRMED_RECEIPT
         │
         ▼
If inter-branch needed: Transfer Order created
  From Branch → IN_TRANSIT → To Branch RECEIVED
```

**Auto-reorder:** System checks stock daily against reorder points and generates suggestions based on consumption velocity.

---

### 7. Production (Central Kitchen) Workflow

```
Production Order: PLANNED
    │
    ▼
Chef starts → Status: IN_PROGRESS
    │
    │  Recipe exploded (BOM):
    │  • 10kg Dough = 7kg Flour + 2kg Water + 1kg Yeast
    │  • Apply prep loss % + cooking loss % + waste %
    │
    ▼
Complete production → Status: COMPLETED
    │
    ├── Ingredients CONSUMED from inventory (FEFO)
    └── Finished product YIELDED into inventory
        (with batch number, expiry date, rolled-up unit cost)
```

---

### 8. Manager Workflow

```
┌─── Daily ────────────────────────────────────────────────┐
│  • Review Dashboard (today's sales, food cost %, GP)     │
│  • Check alerts (low stock, expiry warnings)             │
│  • Approve/modify requisitions                           │
│  • Review POS session variances (cash over/short)        │
│  • Approve new user accounts                             │
└──────────────────────────────────────────────────────────┘

┌─── Weekly ───────────────────────────────────────────────┐
│  • ABC Analysis (which products drive 80% revenue?)      │
│  • Waste Ratio (which items have >10% waste?)            │
│  • Staff Performance (orders/revenue per cashier)        │
│  • Peak Hour Heatmap (staffing optimization)             │
│  • Customer CLV (who are our Champions vs At Risk?)      │
│  • Auto-email report arrives Monday 7 AM                 │
└──────────────────────────────────────────────────────────┘

┌─── Monthly ──────────────────────────────────────────────┐
│  • P&L Summary (Revenue - COGS - Commission = GP)        │
│  • Supplier price comparison (cheapest vendor per item)  │
│  • Menu engineering (Stars/Puzzles/Plowhorses/Dogs)      │
│  • Auto-email report arrives 1st of month                │
└──────────────────────────────────────────────────────────┘
```

---

### 9. Super Admin Workflow

```
┌─── System Configuration ─────────────────────────────────┐
│  • Branches: Add/edit locations, set operating hours      │
│  • Users: Create accounts, assign roles + branches       │
│  • Printers: Configure station routing (IP:port)         │
│  • Payment Methods: Cash/Card/QR/eWallet/Aggregator      │
│  • Currencies: Exchange rates for multi-currency POS     │
│  • Settings: Company info, logo, VAT rate, timezone      │
│  • Self-Order: Kiosk/QR configs per branch               │
│  • QR Codes: Generate menu/table/kiosk QR codes          │
│  • Notifications: WhatsApp API + SMTP email config       │
│  • Loyalty: Programs, rewards, card management           │
│  • Discount Rules: Staff/corporate/BOGO/category         │
└──────────────────────────────────────────────────────────┘
```

---

### 10. Complete Order Lifecycle

```
                    ┌─────────────────┐
                    │   ORDER CREATED  │
                    │  (OPEN status)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         ┌────────┐    ┌─────────┐    ┌────────┐
         │  HELD  │    │  ITEMS  │    │ VOIDED │
         │(parked)│    │  ADDED  │    │(cancel)│
         └───┬────┘    └────┬────┘    └────────┘
             │              │
             └──────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ FIRE TO KDS   │ (Kitchen receives)
            │ (firedAt set) │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │   PAYMENT     │ (Cash/Card/Split)
            │   ADDED       │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │   COMPLETED   │
            └───────┬───────┘
                    │
    ┌───────────────┼───────────────────────────┐
    │               │                           │
    ▼               ▼                           ▼
┌────────┐   ┌──────────┐              ┌────────────────┐
│ Stock  │   │ Finance  │              │ Loyalty Points │
│Deducted│   │ Journal  │              │   Accrued      │
│ (FEFO) │   │ Posted   │              │                │
└────────┘   └──────────┘              └────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │  Can Later:   │
            │  • Refund     │
            │  • Partial    │
            │    Refund     │
            └───────────────┘
```

---

### 11. Real-Time Event Flow

```
Staff Action                    WebSocket Event              Who Receives
─────────────────────────────────────────────────────────────────────────
Waiter claims table      →   table_changed (OCCUPIED)    →  All waiters' floor plans
Waiter adds item         →   order_changed (item_added)  →  KDS board + POS order list
Kitchen marks Ready      →   kds_update                  →  All KDS screens
Cashier completes order  →   order_changed (completed)   →  Waiter floor + session bar
                              table_changed (AVAILABLE)   →  All floor plans
Staff toggles 86         →   product_changed             →  All POS + menu + kiosk
Manager updates price    →   product_changed             →  All POS + menu + kiosk
Session opened/closed    →   session_changed             →  All POS terminals
```

**Result:** Every screen updates in <100ms. No one waits for a refresh. No stale data.

---

### 13. Internal Staff Workflows (Day-to-Day Operations)

#### Opening the Restaurant (Morning Routine)

```
Manager/Cashier arrives
    │
    ├── 1. Open POS Session (count cash in drawer)
    │       → Enter denomination counts (bills + coins)
    │       → System records opening float
    │
    ├── 2. Kitchen staff clock in (Shifts → Quick Clock)
    │       → System records actual start time
    │
    ├── 3. Check alerts dashboard
    │       → Low stock items (need reorder?)
    │       → Expiry warnings (pull items today?)
    │       → Pending requisitions to approve
    │
    ├── 4. Review today's reservations (Bookings page)
    │       → Which tables are reserved and when?
    │       → Any VIP customers expected?
    │
    └── 5. Verify menu availability
            → Check 86'd items from yesterday
            → Auto-86 may have disabled items (low ingredients)
            → Re-enable items that got restocked
```

#### Receiving a Delivery from Supplier

```
Supplier truck arrives at branch/warehouse
    │
    ▼
Warehouse staff opens Purchase Orders page
    │
    ├── Find the matching PO (status: SENT_TO_SUPPLIER)
    │
    ├── Click "Receive" on the PO
    │       │
    │       ├── For each line item:
    │       │   • Enter ACTUAL quantity received (may differ from ordered)
    │       │   • Enter ACTUAL unit price (if different from quoted)
    │       │   • System logs price change in Supplier Price History
    │       │   • Enter batch number (if expiry-tracked)
    │       │   • Enter expiry date (if applicable)
    │       │
    │       └── Confirm receipt
    │               │
    │               ├── Inventory updated (FEFO batch created)
    │               ├── PO status → PARTIALLY_RECEIVED or FULLY_RECEIVED
    │               ├── Accounts Payable entry created (what we owe supplier)
    │               └── If cost price changed → product cost updated
    │
    └── If items came WITHOUT a PO (emergency purchase):
            → Use Inventory → Manual Adjustment (type: RECEIPT)
            → Or create a backdated PO and receive immediately
```

#### Inventory Stock Count (Periodic Audit)

```
Manager initiates stock count
    │
    ├── Start new count (Stock Count page)
    │       → System snapshots current "system quantity" for all items
    │
    ├── Staff physically counts every item
    │       → Enter actual counted quantity per product
    │       → System shows variance (counted - system)
    │
    ├── Save progress (can pause and resume)
    │
    └── Finalize count
            │
            ├── System calculates total variance value
            ├── Inventory adjusted to match physical count
            ├── Audit trail records who counted, when, and all variances
            └── Manager reviews → investigates large discrepancies
```

#### Handling Wastage

```
Kitchen/Warehouse discovers spoiled/damaged stock
    │
    ▼
Open Wastage page → Log new wastage
    │
    ├── Select product (search by name/SKU)
    ├── Enter quantity wasted
    ├── Select reason:
    │   • EXPIRED (past best-before)
    │   • DAMAGED (broken packaging)
    │   • SPILLAGE (dropped/spilled)
    │   • OVERPRODUCTION (made too much)
    │   • QUALITY_REJECTION (doesn't meet standard)
    │   • OTHER
    ├── Add notes (optional)
    │
    └── Submit
            │
            ├── Stock auto-deducted from inventory (FEFO)
            ├── Finance entry posted (wastage cost = qty x cost price)
            ├── If stock now below reorder point → LOW_STOCK alert generated
            └── Waste ratio report updated (waste / sales)
```

#### Branch Transfer (Moving Stock Between Locations)

```
Branch A needs items that Branch B has excess of
    │
    ▼
Manager creates Transfer Order
    │
    ├── Select: From Branch → To Branch
    ├── Add items + quantities to transfer
    ├── Status: DRAFT
    │
    ├── Confirm → Status: IN_TRANSIT
    │       → Source branch stock DEDUCTED
    │       → Items are "in limbo" (not at either branch)
    │
    └── Receiving branch confirms → Status: RECEIVED
            → Destination branch stock CREDITED
            → Both audit trails updated
```

#### End of Day (Closing Routine)

```
Last customer leaves
    │
    ├── 1. Kitchen closes
    │       • Mark remaining prep as wastage (if can't keep)
    │       • Complete any pending production orders
    │       • Staff clock out (Shifts → Quick Clock)
    │
    ├── 2. Waiter closes tables
    │       • Ensure all bills are settled (no RED tables)
    │       • Any held orders → void or complete
    │
    ├── 3. Cashier closes POS session
    │       • Click "Close Session"
    │       • Count all cash by denomination
    │       • System compares: counted vs expected
    │       • Variance recorded (over/short)
    │       • Z-Report auto-prints (session summary)
    │
    ├── 4. Manager reviews
    │       • Check session variance (acceptable? investigate?)
    │       • Review day's sales vs targets
    │       • Approve any pending requisitions for tomorrow
    │       • EOD email auto-sends at 23:55 to all managers
    │
    └── 5. System overnight jobs (automatic)
            • Generate low-stock alerts (hourly)
            • Generate expiry warnings (7 days ahead)
            • Auto-86 check (disable items with 0-stock ingredients)
            • Menu schedule check (disable breakfast items at 11 AM, etc.)
```

#### Handling a Customer Complaint / Refund

```
Customer complains about an order
    │
    ├── Option A: Full Refund
    │       • Manager/Cashier opens Sales History
    │       • Find the order → Click "Refund"
    │       • Confirm (requires BRANCH_MANAGER or SUPER_ADMIN role)
    │       • Stock auto-restocked (RETURN_IN via FEFO)
    │       • Finance entry reversed
    │       • Payment refunded to original method
    │
    ├── Option B: Partial Refund (specific items)
    │       • Click "Partial Refund" on the order
    │       • Select which items to refund (checkboxes)
    │       • Only selected items restocked + refunded
    │       • Order stays COMPLETED (not fully voided)
    │
    └── Option C: Void + Re-make
            • Waiter/Cashier voids the specific item (with reason)
            • KDS shows item as CANCELLED (crossed out)
            • New item added to order → fires to kitchen again
            • No refund needed (customer gets replacement)
```

#### Loyalty and Repeat Customer Flow

```
Customer presents loyalty card (scan barcode / give code)
    │
    ▼
Cashier scans/enters code → System looks up card
    │
    ├── Shows: Customer name, points balance, wallet balance
    │
    ├── At CHECKOUT:
    │   ├── Earn: Customer earns points (1 point per QAR spent)
    │   └── Redeem: Customer spends points for discount
    │       (e.g., 100 points = 5 QAR off)
    │
    └── eWallet: Customer can also pay from prepaid balance
            → Manager tops up wallet (cash/card → store credit)
            → Customer pays from balance at POS
```

---

### 14. Role Access Summary

| Role | Sees | Can Do |
|------|------|--------|
| **SUPER_ADMIN** | Everything | Full system control |
| **BRANCH_MANAGER** | Their branch + reports | Approve, configure, override |
| **CASHIER** | POS + orders + sessions | Take orders, collect payment, refund |
| **WAITER** | Floor plan + menu (no prices for cost) | Take orders, fire to kitchen, split bills |
| **KITCHEN** | KDS board only (no prices) | Advance item status (Queue→Prep→Ready) |
| **PASTRY** | KDS board only (no prices) | Same as kitchen, pastry station |
| **BARISTA** | KDS board only (no prices) | Same as kitchen, bar station |
| **PROCUREMENT** | Suppliers + POs + inventory | Create POs, receive goods, price negotiate |
| **WAREHOUSE** | Inventory + transfers + stock counts | Receive, dispatch, count stock |
| **DRIVER** | My deliveries only | Update delivery status, GPS tracking |
| **CLEANER** | Staff tasks only | Mark cleaning tasks done |
| **ACCOUNTANT** | Finance + reports | View all financial data, no operational actions |

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
- **6 branches:**
  - Central Warehouse (Industrial Area, Doha)
  - **Gaimer w Kahi — West Walk** (Main Branch, Al Sidr St, Lusail)
  - **Gaimer w Kahi — Doha Port** (Second Branch)
  - **Gaimer w Kahi Express — Lusail** (Express format)
  - **Shai bu Hamad — Gulf Mall** (Main Branch, Al Gharafa)
  - **Shai bu Hamad — West Walk** (Second Branch, Al Sidr St, Lusail)
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
