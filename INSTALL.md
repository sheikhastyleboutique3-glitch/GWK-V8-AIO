# GWK V8 AIO — Installation & Operations Guide

This guide covers local development, Docker, database migration/seeding, and production deployment.

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 LTS or 20 LTS |
| npm | 9+ |
| PostgreSQL | 14+ (16 recommended) |
| Docker + Docker Compose | optional, for containerized run |

---

## 2. Environment variables

Copy the template and fill in real values:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials (used by Docker + `DATABASE_URL`). |
| `DATABASE_URL` | Backend connection string, e.g. `postgresql://gwk_user:gwk_password@localhost:5432/gwk_v8_aio?schema=public` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth secrets — generate with `openssl rand -hex 32`. |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (e.g. `15m` / `7d`). |
| `ALLOWED_ORIGINS` | Exact browser origin(s), comma-separated, no trailing slash. |
| `NODE_ENV` | `development` or `production`. |

Create `backend/.env` with at least:

```env
DATABASE_URL="postgresql://gwk_user:gwk_password@localhost:5432/gwk_v8_aio?schema=public"
JWT_SECRET="<openssl rand -hex 32>"
JWT_REFRESH_SECRET="<openssl rand -hex 32>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
ALLOWED_ORIGINS="http://localhost:5173"
```

---

## 3. Local development (without Docker)

### 3.1 Start PostgreSQL
Use a local Postgres or just the DB container:

```bash
docker compose up -d db
```

### 3.2 Backend (NestJS + Prisma)

```bash
cd backend
npm install
npx prisma generate          # generate the typed client
npx prisma migrate deploy    # apply the clean baseline migration
npx prisma db seed           # load the demo restaurant
npm run start:dev            # API on http://localhost:3000  (Swagger: /api)
```

### 3.3 Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev                  # UI on http://localhost:5173
```

---

## 4. Database: migration & seeding

This repo ships a **single clean baseline migration** (`backend/prisma/migrations/00000000000000_init`) generated from the full schema — no legacy migration chain to repair.

```bash
cd backend

# First-time / CI / production: apply migrations idempotently
npx prisma migrate deploy

# Load demo data (branches, menu + recipes, floor plan, printers, payment methods)
npx prisma db seed

# Inspect data
npx prisma studio
```

> **Resetting a dev database** (DESTROYS DATA):
> ```bash
> npx prisma migrate reset
> ```

The backend container entrypoint runs `prisma migrate deploy` automatically before boot (see `backend/Dockerfile` → `npm run start:migrate`).

---

## 5. Run everything with Docker Compose

```bash
cp .env.example .env          # edit secrets
docker compose up -d --build
```

Services:
- **db** — PostgreSQL (persisted volume)
- **backend** — runs `prisma migrate deploy` then boots the API
- **frontend** — built static UI served over HTTP

After the stack is healthy, seed the demo once:

```bash
docker compose exec backend npx prisma db seed
```

---

## 6. Build for production

```bash
# Backend
cd backend && npm run build && node dist/main      # or: npm run start:migrate

# Frontend
cd frontend && npm run build                        # outputs dist/ (serve via nginx/CDN)
```

---

## 7. First-run checklist (operations)

1. **Log in** as the seeded admin (`Admin@1234`) and change the password.
2. **Approve staff** — new users land as `PENDING` until a manager approves them.
3. **Configure the register** — verify the `PosConfig` (terminal), floors, and tables.
4. **Open a POS session** — perform the **opening cash count** before taking orders.
5. **Map printers** — set each menu category's KOT printer (Kitchen / Barista / Pastry) and run the on-prem print agent on the LAN.
6. **At end of shift** — run the **closing control**: count the drawer; the system posts the expected-vs-counted discrepancy to the finance journal.

---

## 8. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `P1001 can't reach database` | Check `DATABASE_URL` host/port and that Postgres is up (`docker compose ps`). |
| `P3009 failed migration` | This baseline is clean; on a fresh DB run `prisma migrate reset` (dev) or ensure the DB is empty before `migrate deploy`. |
| CORS error in browser | Set `ALLOWED_ORIGINS` to the exact UI origin (no trailing slash). |
| KOT not printing | Printer routing is config only; the ESC/POS byte-push requires the on-prem print agent on the same LAN as the printer IPs. |
| Orders not appearing on KDS | Confirm the order's category has a `station`/`printerId` and the KDS WebSocket is connected. |

---

## 9. Useful scripts

| Location | Command | Purpose |
|----------|---------|---------|
| backend | `npm run start:dev` | Dev API with hot reload |
| backend | `npm run build` | Compile to `dist/` |
| backend | `npm run start:migrate` | `prisma migrate deploy` + boot (prod entrypoint) |
| backend | `npx prisma studio` | Browse/edit data |
| backend | `npx prisma db seed` | Load demo data |
| frontend | `npm run dev` | Dev UI |
| frontend | `npm run build` | Production build |
