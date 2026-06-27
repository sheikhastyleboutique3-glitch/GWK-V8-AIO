# GWK V8 AIO — Windows Local Development Setup

> For running the application locally on Windows for development/testing.

---

## Prerequisites

1. **Node.js 18+** — Download from [nodejs.org](https://nodejs.org)
2. **PostgreSQL 15+** — Download from [postgresql.org](https://www.postgresql.org/download/windows/)
3. **Git** — Download from [git-scm.com](https://git-scm.com)

---

## Step 1: Clone the Repository

Open PowerShell or Command Prompt:
```powershell
cd C:\Users\YourName\Desktop
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO
```

---

## Step 2: Set Up PostgreSQL

1. During PostgreSQL installation, note your password (e.g., `postgres123`)
2. Open **pgAdmin** or **psql** and create a database:
```sql
CREATE DATABASE gwk_v8_aio;
```

---

## Step 3: Backend Setup

```powershell
cd backend
npm install

# Create .env file
copy .env.example .env
```

Edit `backend\.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/gwk_v8_aio
JWT_SECRET=my-dev-secret-change-in-production
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=another-dev-secret
NODE_ENV=development
PORT=3000
```

Run migrations and seed:
```powershell
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

Start the backend:
```powershell
npm run start:dev
```

Leave this terminal open. Backend runs at `http://localhost:3000`.

---

## Step 4: Frontend Setup

Open a **new** PowerShell terminal:
```powershell
cd C:\Users\YourName\Desktop\GWK-V8-AIO\frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Step 5: Access the Application

Open your browser:
```
http://localhost:5173
```

Login: `admin@gwk.com` / `Admin@1234`

---

## Step 6: Print Agent (Optional)

If you have a thermal printer on your network:
```powershell
cd C:\Users\YourName\Desktop\GWK-V8-AIO\agent
npm install

# Set environment variables
$env:API_URL="http://localhost:3000"
node print-agent.mjs
```

---

## Building for Production

```powershell
cd frontend
npm run build
# Output in frontend/dist/ — serve with any web server

cd ..\backend
npm run build
# Start production:
npm run start:prod
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `prisma: command not found` | Run `npx prisma` instead of `prisma` |
| Port 5432 in use | Another PostgreSQL instance running — stop it or use port 5433 |
| `EACCES` permission error | Run PowerShell as Administrator |
| Frontend can't reach backend | Check backend is running on :3000, frontend proxies `/api` |
| Build errors (TypeScript) | Delete `node_modules` and reinstall: `Remove-Item -Recurse node_modules; npm install` |
| Vite cache issues | `Remove-Item -Recurse -Force node_modules\.vite` then `npm run dev` |

---

## Updating

```powershell
cd C:\Users\YourName\Desktop\GWK-V8-AIO
git fetch origin
git reset --hard origin/main
cd backend && npm install && npx prisma migrate deploy && npm run build
cd ..\frontend && npm install && npm run build
```

---

## Docker Alternative (Windows)

If you have Docker Desktop installed:
```powershell
cd C:\Users\YourName\Desktop\GWK-V8-AIO
copy .env.example .env
# Edit .env with your settings
docker compose up -d --build
# Open http://localhost
```
