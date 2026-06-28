# GWK V8 AIO — Hostinger VPS Installation (Ubuntu)

> Step-by-step guide to deploy on a Hostinger VPS running Ubuntu 22.04/24.04.

---

## 1. SSH into your VPS

```bash
ssh root@YOUR_VPS_IP
# Or if using a non-root user:
ssh gwk@YOUR_VPS_IP
```

---

## 2. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (skip if root)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 3. Clone the Repository

```bash
cd ~
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO
```

---

## 4. Configure Environment

```bash
cp .env.example .env
nano .env
```

Set these values:
```env
# Database (Docker internal — don't change unless custom setup)
POSTGRES_USER=gwk_user
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=gwk_v8_aio
DATABASE_URL=postgresql://gwk_user:CHANGE_THIS_PASSWORD@postgres:5432/gwk_v8_aio

# Security
JWT_SECRET=GENERATE_A_RANDOM_64_CHAR_STRING
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=ANOTHER_RANDOM_STRING
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production

# CORS (your VPS IP or domain)
ALLOWED_ORIGINS=http://YOUR_VPS_IP,http://yourdomain.com

# Email reports (optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
EOD_EMAIL_RECIPIENTS=manager@yourdomain.com
EOD_EMAIL_ENABLED=true
```

---

## 5. Start the Application

```bash
docker compose up -d --build
```

Wait 30-60 seconds for everything to start. Check status:
```bash
docker compose ps
```

All 3 services should show "healthy" or "Up":
```
gwk-v8-aio-postgres-1   healthy
gwk-v8-aio-backend-1    healthy
gwk-v8-aio-frontend-1   running   0.0.0.0:80->80/tcp
```

---

## 6. Seed Demo Data (First Time Only)

```bash
docker compose exec backend npx prisma db seed
```

---

## 7. Access the Application

Open in your browser:
```
http://YOUR_VPS_IP
```

Login: `admin@gwk.com` / `Admin@1234`

---

## 8. Set Up SSL (HTTPS) — Optional but Recommended

### Option A: Cloudflare (Easiest)
1. Point your domain DNS to the VPS IP via Cloudflare
2. Enable "Full" SSL mode in Cloudflare dashboard
3. Done — Cloudflare handles the certificate

### Option B: Let's Encrypt (Direct)
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
# Then configure the frontend nginx to use the cert
```

---

## 9. Print Agent Setup (For Thermal Printers)

If you have a Raspberry Pi or PC at the restaurant on the same network as your printers:

```bash
# On the Raspberry Pi / restaurant PC:
git clone https://github.com/sheikhastyleboutique3-glitch/GWK-V8-AIO.git
cd GWK-V8-AIO/agent
npm install

# Run the agent
API_URL=http://YOUR_VPS_IP node print-agent.mjs
```

To run as a permanent service:
```bash
sudo tee /etc/systemd/system/gwk-print.service << 'EOF'
[Unit]
Description=GWK Print Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/GWK-V8-AIO/agent
Environment=API_URL=http://YOUR_VPS_IP
ExecStart=/usr/bin/node print-agent.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable gwk-print
sudo systemctl start gwk-print
```

---

## 10. Updating the Application

```bash
cd ~/GWK-V8-AIO
git fetch origin && git reset --hard origin/main
docker compose up -d --build
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 80 in use | `sudo lsof -i :80` → stop Nginx: `sudo systemctl stop nginx && sudo systemctl disable nginx` |
| Backend unhealthy | `docker compose logs backend --tail 50` |
| Database connection refused | `docker compose logs postgres --tail 20` |
| Frontend blank page | Clear browser cache, check `docker compose logs frontend` |
| Can't login | Run seed: `docker compose exec backend npx prisma db seed` |
| Print agent 503 | Backend overloaded — increase `POLL_MS` to 30000 |
| WebSocket not connecting | Check your firewall allows the port, and Nginx proxies `/socket.io` |

---

## Firewall Setup (Recommended)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Backups

### Database Backup (Daily Cron)
```bash
# Create backup script
sudo tee /etc/cron.daily/gwk-backup << 'EOF'
#!/bin/bash
docker compose -f /root/GWK-V8-AIO/docker-compose.yml exec -T postgres pg_dump -U gwk_user gwk_v8_aio | gzip > /root/backups/gwk-$(date +%Y%m%d).sql.gz
find /root/backups -name "gwk-*.sql.gz" -mtime +7 -delete
EOF
sudo chmod +x /etc/cron.daily/gwk-backup
mkdir -p /root/backups
```

### Restore from Backup
```bash
gunzip < /root/backups/gwk-20260627.sql.gz | docker compose exec -T postgres psql -U gwk_user gwk_v8_aio
```
