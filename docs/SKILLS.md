# GWK V8 AIO — Skills & Playbooks

Repeatable how-tos for operating and extending the system.

> **Snapshot:** All POS/admin/kiosk features built & documented (Stage 1). The next stages have playbooks at the bottom — start with **Stage 2: prove the runtime (smoke test)**.

## Dev skills

### Add a new backend module (config CRUD)
1. Create `backend/src/modules/<name>/<name>.{service,controller,module}.ts` (mirror `order-presets`).
2. Service: Prisma `findAll/create/update/remove` (soft-delete via `isActive=false`).
3. Controller: `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(...)`, REST verbs.
4. Register the module in `backend/src/app.module.ts`.
5. Build: `cd backend && npm run build`.

### Add an admin screen for it
1. Create a thin page using `frontend/src/components/ConfigCrud.tsx` (see `OrderPresetsPage`).
2. Add a route in `App.tsx` and a nav entry in `components/Layout.tsx` (Configuration group).
3. Add EN + AR keys under `nav.*` and `cfg.*` (or a page-specific block).
4. Build: `cd frontend && npx tsc --noEmit && npm run build`.

### Change the schema safely
1. Edit `backend/prisma/schema.prisma`.
2. Regenerate the baseline (fresh DB): `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/00000000000000_init/migration.sql`. For an existing DB, add a new additive, idempotent migration instead.
3. `npx prisma generate` → `npx prisma validate` → `npm run build`.

### Ship a change
`build (backend) → tsc+build (frontend) → JSON i18n parse → commit → push (twice) → verify on main`.

## Operations skills

### Open a trading day
Admin/cashier → **Sessions** → open session with the **opening cash count** (denominations). Orders can only be rung up inside an open session — **and** the branch must have an open session before *any* waiter/cashier can create a ticket (enforced in `sales.create`). Waiters don't open sessions; they ride the branch's open session.

### Toggle the session gate (require-open-session)
The gate is controlled by Setting **`pos.requireOpenSession`** (default ON). To relax it (e.g. quick-service that runs "blind"), upsert that setting to value `"false"`:
```sql
INSERT INTO settings(key,value,"group","updatedAt") VALUES('pos.requireOpenSession','false','pos',now())
ON CONFLICT(key) DO UPDATE SET value='false';
```
Set back to `"true"` (or delete the row) to re-enforce. Enforcement lives in `backend/src/modules/sales/sales.service.ts` → `create()`; the session id is stamped on the order at creation.

### Close & reconcile
Close session → enter the **counted drawer** (denominations). The system computes expected-vs-counted and posts the variance as a `CASH_DIFFERENCE` finance entry. Print the Z report.

### Configure KOT printing
**Configuration → Printers** (set IP/port per station) → assign a printer to each menu **Category** → run `agent/print-agent.mjs` on a store device on the same LAN.

### Set up a combo / pricelist / preset
- **Combos:** Configuration → Combos → add lines + choices.
- **Pricelists:** Configuration → Pricelists (fixed or % off, by product/category). Pass `pricelistId` at checkout to auto-price.
- **Presets:** Configuration → Order Presets (Dine-In/Takeout/Delivery); Takeout can carry a **Fiscal Position** for takeout tax.

### Loyalty / eWallet
Configuration → Loyalty → create a program, issue cards. At the till, the **Loyalty / eWallet** tender redeems card balance/points.

### Self-order kiosk / QR
Configuration → Self-Order → create a config; guests order at **`/kiosk/:configId`** (public, no login). Orders land as `isSelfOrder` for staff to confirm.

### Card terminal
Configuration → Payment Terminals (provider + identifier). At the till, the **Terminal** tender runs `/payment-terminals/:id/capture`. Replace the capture seam in `payment-terminals.service.ts` with the real vendor SDK on-site.

## Troubleshooting quick refs
- DB unreachable → check `DATABASE_URL` + PostgreSQL service.
- CORS → `ALLOWED_ORIGINS` must equal the UI origin exactly.
- KDS not live → ensure the `/socket.io/` proxy + WebSocket upgrade headers.
- Migration `P3009` (fresh DB) → ensure the DB is empty before first `migrate deploy`.

## Upcoming-stage playbooks
See the roadmap in `docs/MEMORY.md` → *Status & Roadmap*.

### Stage 2 — prove the runtime (smoke test)
On a machine with PostgreSQL:
```bash
cd backend
cp ../.env.example .env            # real DATABASE_URL + JWT secrets
npm ci && npx prisma generate
npx prisma migrate deploy && npx prisma db seed
npm run start:dev                  # then walk the demo path:
# open session (cashier) → waiter order → fire course → KDS bump →
# cashier split-tender → close session → check Z-report + finance journal
```
Log any runtime errors as issues; fix and re-run until the full cycle is clean.

### Stage 3 — CI
Add `.github/workflows/ci.yml` that on push/PR: installs deps, runs `prisma validate`,
backend `npm run build`, frontend `npx tsc --noEmit && npm run build`, and (optionally)
spins a Postgres service to run `migrate deploy` + seed as a smoke test.

### Stage 4 — manager-approval enforcement
The schema already has `DiscountRule.requiresManagerApproval`. To enforce: in
`sales.service` (discount/void/refund paths) require a manager PIN via
`auth.pinLogin` before applying; surface a PIN modal in the POS.

