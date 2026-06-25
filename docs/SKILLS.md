# GWK V8 AIO — Skills & Playbooks

Repeatable how-tos for operating and extending the system.

---

## POS Operations

### Open a trading day
1. Login as Cashier or Manager → **Sessions / Cash** → Click "Open Session"
2. Enter the **opening cash float** (e.g., 1500.00) and optionally count denominations
3. Session is now OPEN — orders can be created by POS and Waiter

### Take an order (POS)
1. Go to **POS** → Floor Plan → tap a table (or "+ New Order (no table)")
2. Tap products to add them. Products with modifiers show a selection modal.
3. Use the **numpad** (Qty / %Disc / Price) — tap an item first to select it (blue highlight)
4. Click **Kitchen** to fire to KOT (prints only new unfired items)
5. Click **Payment** → select tender (Cash/Card/etc.) → complete sale

### Take an order (Waiter)
1. Go to **Waiter** → tap a table on the floor plan
2. Tap products (modifier modal appears for items with options)
3. Use **+/−** buttons on each item to adjust quantity
4. Click **Send to Kitchen** → prints KOT for newly added items only
5. Click **Hold** or **Request Bill** → cashier picks it up in POS

### Split a bill
1. In POS, open an existing order → click **Split** in the action grid
2. Select items and quantities to move to a new ticket
3. Choose: **Cash** / **Card** (pays + completes the split immediately) or **Pay later** (creates a separate open order)

### Fire to kitchen (KOT behavior)
- **New items only:** Kitchen button only prints items not yet fired (`firedAt: null`)
- **Qty change:** Changing quantity via numpad resets `firedAt` → re-fires with new qty
- **Station split:** KOT splits into separate pages per station (BAR/DRINKS, HOT KITCHEN, PASTRY)
- **Modifier display:** Options/variants show as `→ Extra shot, Large` below item name

### Close & reconcile
1. **Sessions / Cash** → expand session → "Close Session"
2. Enter counted denominations → system shows expected vs counted + variance
3. Print or download Z-Report PDF
4. Variance posted to finance journal automatically

### Correct a payment method (post-sale)
1. Go to **Sales History** → expand a COMPLETED order
2. Click **"Correct payment"** → select the correct method + enter reason
3. Original payment soft-reversed, new one created, audit trail logged

---

## Waiter-specific

### Multi-order tables
- If a table has 2+ open orders, a picker modal shows all orders
- Click one to open it, or "+ New order for this table"

### Send to kitchen
- Only **newly added items** print on KOT (tracked via `sentItemIds`)
- The "Print KOT" button (printer icon) reprints the FULL order

---

## Reports

### PDF Exports
- **Sessions page:** "Download PDF" button → Z/X-Report PDF
- **Sales History:** "Daily Sales PDF" button → full day summary with top products
- **Per-order:** "PDF" button → professional receipt/invoice PDF

### POS Reports page (`/pos-reports`)
- **Product Sales:** quantities + revenue per product, category breakdown
- **Staff Performance:** orders, revenue, avg ticket per user
- **Tip Report:** total tips, by-staff, by-session
- **Cash Reconciliation:** all closed sessions with variances
- **End-of-Day Email:** manual trigger or automatic at 23:55

---

## Dev skills

### Add a new backend module
1. Create `backend/src/modules/<name>/<name>.{service,controller,module}.ts`
2. Service: Prisma CRUD. Controller: `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(...)`
3. Register in `backend/src/app.module.ts`
4. Build: `cd backend && npm run build`

### Add a frontend page
1. Create `frontend/src/pages/<Name>Page.tsx`
2. Add route in `App.tsx` with `<ProtectedRoute roles={[...]}>` wrapper
3. Add nav entry in `components/Layout.tsx` (NAV_SECTIONS)
4. Add i18n keys in `locales/en.json` + `locales/ar.json`
5. Build: `cd frontend && npm run build`

### Change the schema
1. Edit `backend/prisma/schema.prisma`
2. `npx prisma db push` (dev) or add a migration
3. `npx prisma generate` → `npm run build`

### Add a modifier/option to a product
1. **Modifiers** page → create a group (e.g., "Size") with options (S/M/L)
2. Link the group to products via the product modifier assignment
3. POS + Waiter will automatically show the selection modal

### Important: modifiers DTO
The `OrderItemDto.modifiers` field MUST be `@IsOptional() modifiers?: any` (NOT `@IsArray()`).
`class-transformer` with `enableImplicitConversion: true` strips nested objects if typed as array.

---

## Deployment

### Fresh install
```bash
git clone <repo>
cd backend && npm install && npx prisma db push && npx prisma db seed && npm run build
cd ../frontend && npm install && npm run build
cd ../backend && npm run start:prod
```

### Update (running system)
```bash
git pull
cd backend && npm run build
cd ../frontend && npm run build
# Restart backend (pm2 restart / systemctl restart / re-run start:prod)
```

### Reset database
```bash
cd backend
npx prisma db push --force-reset
npx prisma db seed
```

### Environment variables (backend `.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/gwk_v8_aio
JWT_SECRET=your-secret-key
PORT=3000

# Optional: End-of-day email
EOD_EMAIL_ENABLED=true
EOD_EMAIL_RECIPIENTS=manager@company.qa
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password
SMTP_FROM=noreply@company.qa
```
