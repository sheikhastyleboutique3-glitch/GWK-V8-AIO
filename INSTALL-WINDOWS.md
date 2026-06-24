# GWK V8 AIO — Installation on Windows (local / dev)

A step-by-step guide to run GWK V8 AIO on a Windows 10/11 machine for development or an in-store till.

---

## 1. Install prerequisites

| Software | Version | Get it |
|----------|---------|--------|
| **Node.js** | 20 LTS | https://nodejs.org (LTS installer) |
| **Git** | latest | https://git-scm.com/download/win |
| **PostgreSQL** | 16 | https://www.postgresql.org/download/windows/ |
| **VS Code** (optional) | latest | https://code.visualstudio.com |

During PostgreSQL setup, remember the **password** you set for the `postgres` superuser and keep the default port **5432**.

Verify in **PowerShell**:
```powershell
node -v   # v20.x
npm -v
git --version
psql --version
```

---

## 2. Get the code

```powershell
cd C:\
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO
```

---

## 3. Create the database

Open **SQL Shell (psql)** or run in PowerShell:
```powershell
psql -U postgres -c "CREATE DATABASE gwk_v8_aio;"
psql -U postgres -c "CREATE USER gwk_user WITH PASSWORD 'gwk_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE gwk_v8_aio TO gwk_user;"
psql -U postgres -d gwk_v8_aio -c "GRANT ALL ON SCHEMA public TO gwk_user;"
```

---

## 4. Configure the backend

Create `backend\.env` (PowerShell `notepad backend\.env`):
```env
DATABASE_URL="postgresql://gwk_user:gwk_password@localhost:5432/gwk_v8_aio?schema=public"
JWT_SECRET="replace_with_a_32+_char_random_string"
JWT_REFRESH_SECRET="replace_with_another_32+_char_string"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
ALLOWED_ORIGINS="http://localhost:5173"
NODE_ENV="development"
```
Generate secrets:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Install & initialize the backend

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate deploy     # creates all tables from the baseline
npx prisma db seed            # loads the demo restaurant
npm run start:dev             # API at http://localhost:3000  (Swagger: /api)
```
Leave this window running.

---

## 6. Run the frontend

Open a **second** PowerShell window:
```powershell
cd C:\GWK-V8-AIO\frontend
npm install
npm run dev                   # UI at http://localhost:5173
```

Open **http://localhost:5173**, sign in with the seeded admin (password `Admin@1234`), and change the password.

---

## 7. KOT printing (optional, in-store)
Run the on-prem print agent on the till PC (same LAN as the printers):
```powershell
cd C:\GWK-V8-AIO\agent
$env:API_URL="http://localhost:3000"; $env:API_TOKEN="<JWT of a POS user>"; $env:BRANCH_ID="2"
node print-agent.mjs
```
Configure each printer's IP under **Configuration → Printers** and assign printers to menu categories.

---

## 8. Production build on Windows (optional)
```powershell
cd backend; npm run build          # dist\  -> run with: node dist\main
cd ..\frontend; npm run build      # dist\  -> serve with any static host / IIS
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `psql: command not found` | Add `C:\Program Files\PostgreSQL\16\bin` to PATH, reopen PowerShell |
| `P1001 can't reach database` | Ensure the **postgresql-x64-16** service is running (services.msc); check `DATABASE_URL` |
| `EADDRINUSE :3000 / :5173` | Another process uses the port — close it or change the port |
| CORS error in browser | `ALLOWED_ORIGINS` must equal the UI origin exactly (no trailing slash) |
| Prisma client errors after pulling updates | Re-run `npx prisma generate` |
