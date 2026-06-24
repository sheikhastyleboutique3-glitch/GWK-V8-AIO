# GWK V8 AIO — Deployment on a Hostinger VPS (Ubuntu)

Production deployment guide for a **Hostinger KVM VPS running Ubuntu 22.04 / 24.04**.
Two paths are provided — **A) Docker Compose (recommended)** and **B) Manual (Node + PostgreSQL + Nginx + PM2)**.

> Minimum VPS: 1 vCPU / 4 GB RAM (KVM 2). Point a domain's A-record at the VPS IP if you want HTTPS.

---

## 0. First login & hardening

```bash
ssh root@YOUR_VPS_IP

apt update && apt upgrade -y
adduser gwk && usermod -aG sudo gwk          # create a non-root user
# (optional) copy your SSH key, then disable root/password login in /etc/ssh/sshd_config

# Firewall
apt install -y ufw
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```
Re-login as `gwk` for the rest of this guide.

---

# Path A — Docker Compose (recommended)

### A1. Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker --version && docker compose version
```

### A2. Get the code
```bash
cd ~
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO
```

### A3. Configure environment
```bash
cp .env.example .env
nano .env
```
Set strong values (generate with `openssl rand -hex 32`):
```env
POSTGRES_USER=gwk_user
POSTGRES_PASSWORD=__strong_db_password__
POSTGRES_DB=gwk_v8_aio
JWT_SECRET=__64_hex__
JWT_REFRESH_SECRET=__64_hex__
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

### A4. Launch
```bash
docker compose up -d --build
docker compose ps                       # db, backend, frontend should be healthy
```
The backend container runs `prisma migrate deploy` automatically on boot. Seed once:
```bash
docker compose exec backend npx prisma db seed
```

### A5. Reverse proxy + HTTPS (Nginx + Let's Encrypt)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/gwk
```
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/      { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $remote_addr; }
    location /uploads/  { proxy_pass http://127.0.0.1:3000; }
    location /socket.io/ { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
    location /          { proxy_pass http://127.0.0.1:8080; }   # frontend container
}
```
> Adjust ports to match `docker-compose.yml` (backend 3000, frontend served port).
```bash
sudo ln -s /etc/nginx/sites-available/gwk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com          # issues + auto-renews HTTPS
```

### A6. Updates
```bash
cd ~/GWK-V8-AIO && git pull
docker compose up -d --build                     # migrations run on backend boot
```

---

# Path B — Manual (Node + PostgreSQL + Nginx + PM2)

### B1. Install runtimes
```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

sudo npm i -g pm2
```

### B2. Create the database
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE gwk_v8_aio;
CREATE USER gwk_user WITH PASSWORD 'strong_db_password';
GRANT ALL PRIVILEGES ON DATABASE gwk_v8_aio TO gwk_user;
\c gwk_v8_aio
GRANT ALL ON SCHEMA public TO gwk_user;
SQL
```

### B3. Backend
```bash
cd ~ && git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO/backend
cat > .env <<'ENV'
DATABASE_URL="postgresql://gwk_user:strong_db_password@localhost:5432/gwk_v8_aio?schema=public"
JWT_SECRET="__64_hex__"
JWT_REFRESH_SECRET="__64_hex__"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
NODE_ENV="production"
ALLOWED_ORIGINS="https://yourdomain.com"
ENV
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run build
pm2 start dist/main.js --name gwk-api
```

### B4. Frontend
```bash
cd ~/GWK-V8-AIO/frontend
npm ci
npm run build               # outputs dist/
```

### B5. Nginx (serves the built frontend + proxies the API)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/gwk
```
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /home/gwk/GWK-V8-AIO/frontend/dist;
    index index.html;

    location /api/       { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $remote_addr; }
    location /uploads/   { proxy_pass http://127.0.0.1:3000; }
    location /socket.io/ { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
    location /           { try_files $uri /index.html; }       # SPA fallback
}
```
```bash
sudo ln -s /etc/nginx/sites-available/gwk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
pm2 save && pm2 startup        # keep the API running across reboots
```

### B6. Updates
```bash
cd ~/GWK-V8-AIO && git pull
cd backend && npm ci && npx prisma migrate deploy && npm run build && pm2 restart gwk-api
cd ../frontend && npm ci && npm run build && sudo systemctl reload nginx
```

---

## Operations

- **Logs:** `pm2 logs gwk-api` (Path B) or `docker compose logs -f backend` (Path A)
- **DB backup:** `pg_dump -U gwk_user gwk_v8_aio > backup_$(date +%F).sql`
- **DB restore:** `psql -U gwk_user gwk_v8_aio < backup.sql`
- **First-run checklist:** log in as admin → change password → approve staff → set printers/floors → open a POS session (opening cash count).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 502 Bad Gateway | API not running — `pm2 status` / `docker compose ps`; check ports in Nginx |
| `P1001` DB unreachable | Check `DATABASE_URL`, that PostgreSQL is running, and credentials |
| WebSocket/KDS not live | Ensure the `/socket.io/` proxy block with `Upgrade` headers is present |
| CORS errors | `ALLOWED_ORIGINS` must equal your HTTPS domain exactly |
| Migration `P3009` | Fresh DB only: ensure the DB is empty before first `migrate deploy` |
