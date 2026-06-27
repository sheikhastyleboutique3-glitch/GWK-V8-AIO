# GWK V8 AIO — Skills & Playbooks

Repeatable how-tos for operating and extending the system.

---

## POS Operations

### Open a trading day
1. Login → **Sessions** → "Open Session"
2. Enter opening cash float (denomination count)
3. Session is OPEN — orders can be created

### Take a dine-in order
1. **POS** → Floor Plan → tap a table
2. System creates an order for that table (or opens existing)
3. Tap products → modifiers modal if applicable
4. Use numpad: tap **Qty** → type digits → quantity updates LIVE
5. Click **Kitchen** → KOT prints only new items
6. Click **Payment** → add tender → Complete

### Take a takeaway/delivery order
1. **POS** → Order tab → select **Takeaway** or **Delivery** preset
2. Type customer name/address in the input field
3. Add items → Kitchen → Payment → Complete
4. KOT prints with prominent ***** TAKEAWAY ***** or ***** DELIVERY ***** banner

### Numpad (no popups)
- Tap an item in the order list (green highlight)
- Tap **Qty** → type `5` → quantity changes to 5 immediately
- Tap **%Disc** → type `15` → 15% discount applies instantly
- Tap **Price** → type `12` → price changes to 12.00
- Tap **C** → clears the numpad buffer
- All works via mode-based input — no browser popups

### Split a bill
1. In POS or Waiter → click **Split**
2. Use **- 0 +** quantity picker per item
3. Select how many of each item to split off
4. Click "Create separate bill" → new order created
5. Works even with a single item (e.g., split 3 of 6 cheesecakes)

### Fire to kitchen (KOT)
- **New items only:** Kitchen button prints items not yet fired
- **Qty change:** Changing quantity resets `firedAt` → re-fires
- **Station split:** KOT splits into BAR/DRINKS, HOT KITCHEN, PASTRY
- **Channel display:** DINE IN T5 / *** DELIVERY *** / *** TAKEAWAY ***
- **Sync:** Both POS and Waiter see 🔥 indicator within 5 seconds

### KDS (Kitchen Display)
- Station tabs: 🍽️ All / 🔥 Hot Kitchen / 🧁 Pastry / ☕ Bar
- Orders grouped by order number (not split per item)
- Shows: DINE IN Main Hall → T5 / 🚗 DELIVERY / 🥡 TAKEAWAY
- Per-item "Start"/"Ready" buttons + "Start All" for batch
- Real-time via Socket.IO (instant updates)

### Close & reconcile
1. **Sessions** → "Close Session" (blocked if OPEN orders exist!)
2. Void or complete all pending orders first
3. Enter denomination count → expected vs counted → variance
4. Z-Report prints automatically

### Void an order
- Click **❌ Void All** in the action grid
- Single prompt for cancellation reason (no double popup)
- Order marked VOIDED in the system

### Correct a payment method
1. **Sales History** → expand a COMPLETED order
2. Click "Correct payment" → select the tender to fix
3. Choose new method + enter reason
4. Original soft-reversed, new payment created, audit logged

---

## Floor Plan

### Edit tables (shape, name, seats)
1. Click **✏️** button (top-right) to enter edit mode
2. **Single click** any table → edit dialog:
   - Table name
   - Seats (number)
   - Shape: Square / Round / Rectangle (dropdown)
3. **Drag** tables to reposition
4. **Resize** (drag corner handle)
5. Click "Save Layout" when done

### Add new area/floor
- In edit mode → click "+ Area" → name it
- Click "+ Table" → name + seats
- Pick floor background color (color picker button)

---

## Waiter

### Floor tabs
- Waiter now shows floor/area tabs (All / Main Hall / Terrace / etc.)
- New areas created in POS appear immediately

### Send to kitchen
- Only **unfired items** send (tracked via `firedAt` from DB)
- Shows "✓ All items sent to kitchen" when nothing new to fire
- KOT sync: if POS fires, Waiter sees 🔥 within 5 seconds

### Split bill (waiter)
- Quantity picker per item (not checkboxes)
- No payment step — cashier handles payment later

---

## Settings

### Company Info
- Company Name, Name (AR), Tax ID, Address, **Phone**, **Email**
- All shown on receipts/invoices/Z-reports

### POS & Sales
- `pos.requireOpenSession` — toggle (orders blocked without session)
- `pos.allowNegativeStock` — toggle (global override for stock check)

### Per-product negative stock
- Menu page → each product card → toggle "Allow negative stock"
- Also in Edit modal (checkbox)
- Inventory page shows `∞ neg OK` badge

### Currency
- `default_currency` → shown on all receipts (default: QAR)

---

## Theme & Display (sidebar 🎨 icon)

### Appearance tab
- Light / Dark mode toggle
- 9 color presets (Swiss Pro, Ocean Blue, Emerald, Amber, Rose, Violet, Teal, Graphite, Crimson)
- Manual color picker with full ramp generation
- Font selector (Inter / Cairo / System)
- Live preview

### Density tab
- Compact / Default / Spacious
- Auto-detect device (touch → Spacious)

### Automation tab
- OS sync (follows system dark/light)
- Time-based schedule
- Save to server (cross-device)

---

## Reports & Export

### CSV Export (17 types)
sales-orders, customers, tax-report, requisitions, inventory, expiry-alerts, low-stock, purchase-orders, wastage, sessions, transfers, deliveries, receivables, payables, users, production, loyalty

### DataToolbar (on all 17+ list pages)
- Advanced filter (AND/OR logic, field picker, operators)
- Group By (multi-layer collapsible)
- Export button
- Saved Views (⭐ set as default)

---

## Deployment

### Fresh install (Windows)
```powershell
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO/backend
copy .env.example .env  # Edit DATABASE_URL + JWT_SECRET
npm install
npx prisma db push
npx prisma db seed
npm run build
cd ..\frontend
npm install
npm run build
cd ..\backend
npm run start:prod
```

### Update
```powershell
git fetch origin && git reset --hard origin/main
cd backend && npm install && npx prisma db push && npm run build
cd ..\frontend && npm install && npm run build
cd ..\backend && npm run start:prod
```

### Backup (daily cron)
```bash
bash scripts/backup.sh
```
