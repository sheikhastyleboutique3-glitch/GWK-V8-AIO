# GWK V8 — Real-Time Print Agent

Instant ESC/POS printing for KOT (Kitchen Order Tickets) and customer receipts.

## How It Works

```
POS/Waiter fires order → Backend → WebSocket push → Agent → Printer (< 100ms)
```

The agent connects to the backend via **WebSocket** and prints **instantly** when:
- **KOT**: Items are fired to the kitchen (from POS or Waiter)
- **Receipt**: An order is marked as completed/paid

If WebSocket is unavailable (proxy issue, etc.), it falls back to polling.

## Setup

### 1. Install (one time)
```bash
cd agent
npm install
```

### 2. Configure Printers in App
- Go to **Printers** page in the GWK app
- Add your printer(s) with their **IP address** and **port** (default: 9100)
- Go to **Categories** page and assign each category to a printer (station routing)

### 3. Run the Agent

**Linux / Mac / Raspberry Pi:**
```bash
API_URL=http://your-vps-ip BRANCH_ID=2 node print-agent.mjs
```

**Windows (CMD):**
```cmd
set API_URL=http://your-vps-ip
set BRANCH_ID=2
node print-agent.mjs
```

**Windows (PowerShell):**
```powershell
$env:API_URL="http://your-vps-ip"
$env:BRANCH_ID="2"
node print-agent.mjs
```

### 4. Run as Service (auto-start on boot)

**Raspberry Pi / Linux (systemd):**
```bash
sudo tee /etc/systemd/system/gwk-print.service << 'EOF'
[Unit]
Description=GWK Print Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/GWK-V8-AIO/agent
Environment=API_URL=http://your-vps-ip
Environment=BRANCH_ID=2
ExecStart=/usr/bin/node print-agent.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable gwk-print
sudo systemctl start gwk-print
```

**Windows (Task Scheduler):**
- Create a task that runs `node C:\path\to\agent\print-agent.mjs`
- Set environment variables in the task action
- Trigger: At startup

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:3000` | Backend URL (your VPS IP) |
| `API_EMAIL` | `admin@gwk.com` | Login email |
| `API_PASSWORD` | `Admin@1234` | Login password |
| `BRANCH_ID` | _(all branches)_ | Filter to specific branch |
| `POLL_MS` | `30000` | Fallback poll interval (only used when WebSocket is down) |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VPS (Cloud)                           │
│  ┌─────────┐      ┌──────────────────────────────────┐  │
│  │ Frontend │◄────►│ Backend (NestJS + Socket.IO)     │  │
│  └─────────┘      └──────────┬───────────────────────┘  │
│                              │ WebSocket (/realtime)      │
└──────────────────────────────┼───────────────────────────┘
                               │
                   ┌───────────▼──────────┐
                   │  Print Agent (LAN)    │
                   │  - Receives: order:changed
                   │  - Action: fired → KOT print
                   │  - Action: completed → receipt print
                   └───────────┬──────────┘
                               │ TCP/IP (port 9100)
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌───────▼───────┐   ┌───────▼───────┐
   │ Hot Kitchen  │    │ Pastry/Bakery │   │ Receipt       │
   │ Printer      │    │ Printer       │   │ Printer       │
   └──────────────┘    └───────────────┘   └───────────────┘
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `socket.io-client not installed` | Run `npm install` in the agent folder |
| `Auto-login failed` | Check API_URL, API_EMAIL, API_PASSWORD |
| `No active printers` | Add printers with IP in the Printers page |
| `print failed: timeout` | Check printer is on same LAN, IP is correct |
| `WebSocket disconnected` | Normal — agent auto-reconnects and uses polling meanwhile |
