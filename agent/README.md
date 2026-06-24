# GWK V8 AIO — On-prem KOT Print Agent

A tiny, zero-dependency Node service that prints kitchen order tickets (KOT) to
**network ESC/POS thermal printers** on the store LAN. The cloud/backend stays
out of the printing path — it only exposes the routed ticket payloads; this
agent does the raw byte push locally.

## How it works
1. Polls `GET /sales/orders?status=OPEN&branchId=<id>` for new tickets.
2. For each new order, calls `GET /printers/kot/:orderId` which returns
   **station-grouped tickets** (Hot Kitchen / Barista / Pastry) with a ready
   `text` body and the target `printer.ipAddress:port`.
3. Wraps each ticket in ESC/POS (init + emphasized text + partial cut) and
   sends it over TCP to the printer.

Each order is printed once per agent run (tracked in memory).

## Requirements
- Node.js 18+ (uses global `fetch`)
- Network thermal printers reachable by IP (configure each printer's IP in the
  app under **Configuration → Printers**, and assign printers to categories).

## Run
```bash
API_URL=http://192.168.1.10:3000 \
API_TOKEN=<JWT of a POS user> \
BRANCH_ID=2 \
POLL_MS=5000 \
node print-agent.mjs
```

| Env | Default | Purpose |
|-----|---------|---------|
| `API_URL` | `http://localhost:3000` | Backend base URL |
| `API_TOKEN` | — | Bearer JWT for a POS-capable user |
| `BRANCH_ID` | (all) | Branch to print for |
| `POLL_MS` | `5000` | Poll interval |
| `DEFAULT_PRINTER_IP` | — | Fallback IP if a ticket's category has no printer |
| `DEFAULT_PRINTER_PORT` | `9100` | Raw ESC/POS port |

## Deploy as a service (systemd)
```ini
# /etc/systemd/system/gwk-print-agent.service
[Unit]
Description=GWK KOT Print Agent
After=network.target

[Service]
Environment=API_URL=http://192.168.1.10:3000
Environment=API_TOKEN=__JWT__
Environment=BRANCH_ID=2
ExecStart=/usr/bin/node /opt/gwk/agent/print-agent.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now gwk-print-agent
```

> Note: this is on-prem hardware glue — it cannot run inside the cloud sandbox
> (no LAN printers there). Deploy it on a store device on the same network as
> the printers.
