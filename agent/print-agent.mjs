#!/usr/bin/env node
/**
 * GWK V8 AIO — On-prem KOT print agent (ESC/POS over TCP/IP).
 *
 * Runs on the in-store LAN (Raspberry Pi / mini-PC). It polls the backend for
 * new OPEN orders in a branch, fetches the station-grouped KOT tickets from
 * `GET /printers/kot/:orderId`, and pushes each ticket as raw ESC/POS bytes to
 * the matching network printer (the `printer.ipAddress:port` returned per
 * ticket). Tickets without a network printer are skipped (configure their IP).
 *
 * Zero external dependencies — uses only Node built-ins (node:net, fetch).
 * Requires Node 18+ (global fetch).
 *
 * Env:
 *   API_URL     Backend base URL              (e.g. http://192.168.1.10:3000)
 *   API_TOKEN   JWT for a POS-capable user    (Bearer token)
 *   BRANCH_ID   Branch to print for           (e.g. 2)
 *   POLL_MS     Poll interval in ms           (default 5000)
 *   DEFAULT_PRINTER_IP  Fallback printer IP if a ticket has none (optional)
 *   DEFAULT_PRINTER_PORT  (default 9100)
 *
 * Usage:
 *   API_URL=http://192.168.1.10:3000 API_TOKEN=xxx BRANCH_ID=2 node print-agent.mjs
 */
import net from 'node:net';

const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_TOKEN = process.env.API_TOKEN || '';
const BRANCH_ID = process.env.BRANCH_ID || '';
const POLL_MS = parseInt(process.env.POLL_MS || '5000', 10);
const DEFAULT_PRINTER_IP = process.env.DEFAULT_PRINTER_IP || '';
const DEFAULT_PRINTER_PORT = parseInt(process.env.DEFAULT_PRINTER_PORT || '9100', 10);

const printed = new Set(); // orderIds already sent to the kitchen this run

// ---- ESC/POS helpers --------------------------------------------------------
const ESC = 0x1b;
const GS = 0x1d;
function escpos(ticketText, widthMm = 80) {
  const chunks = [];
  chunks.push(Buffer.from([ESC, 0x40])); // ESC @  initialize
  chunks.push(Buffer.from([ESC, 0x61, 0x00])); // left align
  chunks.push(Buffer.from([ESC, 0x21, 0x08])); // emphasized
  chunks.push(Buffer.from(ticketText + '\n\n\n', 'utf8'));
  chunks.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // GS V B 0  partial cut
  return Buffer.concat(chunks);
}

function sendToPrinter(ip, port, buf) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (ok, err) => { if (done) return; done = true; try { sock.destroy(); } catch {} ok ? resolve(true) : (console.error(`  ✗ print to ${ip}:${port} failed:`, err?.message || err), resolve(false)); };
    sock.setTimeout(8000);
    sock.on('timeout', () => finish(false, 'timeout'));
    sock.on('error', (e) => finish(false, e));
    sock.connect(port, ip, () => sock.write(buf, () => setTimeout(() => finish(true), 250)));
  });
}

// ---- Backend calls ----------------------------------------------------------
async function api(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${API_TOKEN}` } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  const body = await res.json();
  return body?.data ?? body;
}

async function tick() {
  try {
    const orders = await api(`/sales/orders?status=OPEN${BRANCH_ID ? `&branchId=${BRANCH_ID}` : ''}`);
    for (const order of orders || []) {
      if (printed.has(order.id)) continue;
      const { tickets } = await api(`/printers/kot/${order.id}`);
      for (const tk of tickets || []) {
        const ip = tk.printer?.ipAddress || DEFAULT_PRINTER_IP;
        const port = tk.printer?.port || DEFAULT_PRINTER_PORT;
        if (!ip) { console.warn(`  ! ${tk.station}: no printer IP, skipping`); continue; }
        const ok = await sendToPrinter(ip, port, escpos(tk.text, tk.printer?.widthMm || 80));
        if (ok) console.log(`  ✓ ${order.orderNo} → ${tk.station} @ ${ip}:${port}`);
      }
      printed.add(order.id);
    }
  } catch (e) {
    console.error('poll error:', e.message);
  }
}

console.log(`GWK print agent → ${API_URL} (branch ${BRANCH_ID || 'all'}), polling every ${POLL_MS}ms`);
if (!API_TOKEN) console.warn('WARNING: API_TOKEN is empty — set a POS user JWT.');
tick();
setInterval(tick, POLL_MS);
