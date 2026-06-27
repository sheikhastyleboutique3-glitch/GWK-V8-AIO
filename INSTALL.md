# GWK V8 AIO — Installation Guide (General Linux/Mac)

## Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **PostgreSQL** 15+
- **npm** or **yarn**
- **Git**

---

## Option A: Docker (Recommended — Single Command)

```bash
# 1. Clone
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO

# 2. Configure
cp .env.example .env
nano .env   # Set DATABASE_URL, JWT_SECRET, SMTP settings

# 3. Start everything
docker compose up -d --build

# 4. Wait for healthy status
docker compose ps   # all 3 services should be "healthy" or "running"

# 5. Access
# Frontend: http://localhost
# Backend API: http://localhost/api
# Swagger Docs: http://localhost/api/docs (dev mode only)
```

**Default ports:**
- Frontend (Nginx): 80
- Backend (NestJS): 3000 (internal, proxied through frontend Nginx)
- PostgreSQL: 5432 (internal)

---

## Option B: Manual Setup (Development)

### 1. Database

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-client

# Create database
sudo -u postgres createuser gwk_user -P   # Enter password when prompted
sudo -u postgres createdb gwk_v8_aio -O gwk_user
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql://gwk_user:YOUR_PASSWORD@localhost:5432/gwk_v8_aio
#   JWT_SECRET=your-random-secret-here
#   JWT_EXPIRES_IN=8h

# Run migrations + generate Prisma client
npx prisma migrate deploy
npx prisma generate

# Seed demo data
npx prisma db seed

# Start development server
npm run start:dev
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173
```

### 4. Print Agent (Optional — for thermal printers)

```bash
cd agent
npm install

# Run (on a PC/Raspberry Pi on the same LAN as printers)
API_URL=http://localhost:3000 node print-agent.mjs
```

---

## Post-Installation Setup

### First Login
1. Open the app in your browser
2. Login: `admin@gwk.com` / `Admin@1234`
3. Go to **Settings** → set company name, logo, currency, address

### Configure Branch
1. Go to **Branches** → edit or create your branch
2. Set address, phone, cash float

### Add Printers
1. Go to **Printers** → Add Printer
2. Enter name, IP address, port (default 9100)
3. Go to **Categories** → assign each category to a printer (station routing)

### Set Up Users
1. Go to **Users** → create accounts for staff
2. Set role (Cashier, Waiter, Kitchen, etc.)
3. Set a 4-digit POS PIN for quick switching
4. Assign to branch(es)

### Enable Staff Performance
1. Go to **Settings** → Staff Performance → set to "true"
2. Report generates nightly at 00:30 (or click "Refresh" to generate now)

---

## Production Checklist

- [ ] Set `NODE_ENV=production` in .env
- [ ] Set strong `JWT_SECRET` (random 64-char string)
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Configure SMTP for EOD email reports
- [ ] Set up SSL (Let's Encrypt / Cloudflare)
- [ ] Configure firewall (only ports 80/443 open)
- [ ] Set up daily PostgreSQL backups
- [ ] Run Print Agent as a systemd service (see agent/README.md)

---

## Updating

```bash
cd GWK-V8-AIO
git fetch origin && git reset --hard origin/main
docker compose up -d --build
```

Or without Docker:
```bash
git fetch origin && git reset --hard origin/main
cd backend && npm install && npx prisma migrate deploy && npm run build
cd ../frontend && npm install && npm run build
# Restart your process manager (pm2 restart all)
```
